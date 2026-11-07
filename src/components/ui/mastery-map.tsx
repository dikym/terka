"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { GroupId } from "@/lib/view/groups";
import { referenceHref } from "@/lib/view/reference";
import { Button } from "@/components/ui/button";
import { CodeChip, CodeLink } from "@/components/ui/code-chip";
import { Dot } from "@/components/ui/feedback";
import { GROUP_NAME, GROUP_TEXT } from "@/components/ui/groups";
import { Icon, type IconName } from "@/components/ui/icon";
import { Tooltip as LabelTip } from "@/components/ui/tooltip";

export type MapProvince = {
	name: string;
	group: GroupId;
	codes: string[];
	/** null: no study material for this province yet. */
	percent: number | null;
	mastered: number;
	total: number;
};

export function fillStep(percent: number | null): 0 | 1 | 2 | 3 | 4 | 5 {
	if (percent === null) return 0;
	if (percent === 0) return 1;
	if (percent < 34) return 2;
	if (percent < 67) return 3;
	if (percent < 100) return 4;
	return 5;
}

const FILLS = [
	"var(--color-paper-50)",
	"var(--color-ink-100)",
	"var(--color-go-100)",
	"var(--color-go-300)",
	"var(--color-go-500)",
	"var(--color-go-700)"
];

// map.svg is 1000 × 371; the extra room on the right keeps the zoom buttons off the islands.
const VIEW = { x: -16, y: -16, w: 1080, h: 403 };
const MAP = { w: 1000, h: 371 };
const ZOOM_STEP = 1.6;
const MAX_ZOOM = 10;
// Screen pixels. Below the 15 or so a phone browser may swallow before its first pointermove,
// so the distance is also checked on release: a short swipe may report no move at all.
const TAP_RANGE = 8;
const TAP_MS = 400;
// Pixels per millisecond and milliseconds: a flick glides on for its speed times FLING_MS.
const FLING_MS = 300;
const FLING_START = 0.2;
const FLING_STOP = 0.02;
// The speed comes from the finger's last moments, and a finger that rested before lifting has none.
const FLING_WINDOW_MS = 100;
const FLING_REST_MS = 40;
// A layer that was scaled is blurred until the land is redrawn at the new zoom. Redrawing blocks
// the page long enough to show under a moving finger, and for iOS to stop letting the page keep
// a new touch (touchstart arrives with cancelable=false). So it runs once per zoom, picks a moment
// when nothing is moving, and only gives up waiting for one after REDRAW_LATEST_MS.
const REDRAW_MS = 150;
const REDRAW_RETRY_MS = 50;
const REDRAW_LATEST_MS = 1000;
const FINGER_STILL_MS = 120;

type View = { k: number; x: number; y: number };
type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };
type Gesture = {
	/** What the land's own transforms last painted. */
	base: View;
	live: View;
	box: Box;
	/** The view and the fingers when the number of fingers last changed. */
	anchor: View;
	from: Point[];
	trail: (Point & { at: number })[];
};

/** Keeps the land over the whole box once it is big enough to cover it, and centred until then. */
export function clampView({ k, x, y }: View, box: Box): View {
	const scale = Math.min(MAX_ZOOM, Math.max(1, k));
	const unit = VIEW.w / box.width;
	const top = VIEW.y - (box.height * unit - VIEW.h) / 2;
	const bottom = VIEW.y + VIEW.h + (box.height * unit - VIEW.h) / 2;
	const height = MAP.h * scale;
	return {
		k: scale,
		// Left of 0 the view's own margin shows; the room right of the land at full view is on purpose.
		x: Math.min(0, Math.max(Math.min(0, VIEW.x + VIEW.w - MAP.w * scale), x)),
		y:
			height < bottom - top
				? (top + bottom - height) / 2
				: Math.min(top, Math.max(bottom - height, y))
	};
}

/** Zooms by `factor` keeping the point (px, py), in view units, still. */
const zoomAt = (view: View, factor: number, px: number, py: number, box: Box) => {
	const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
	const ratio = k / view.k;
	return clampView({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, box);
};

/** A client point inside the map, in view units. */
function pointerIn(rect: Box, clientX: number, clientY: number) {
	const scale = VIEW.w / rect.width;
	const height = VIEW.w / (rect.width / rect.height);
	return {
		x: (clientX - rect.left) * scale + VIEW.x,
		y: (clientY - rect.top) * scale - (height - VIEW.h) / 2 + VIEW.y
	};
}

/**
 * Zoom for one wheel event, the way Google Maps behaves: a mouse notch steps one level
 * (2×) with an animation, while a trackpad (pinch, or a two-finger swipe) follows the
 * gesture continuously, doubling over about 100 pixels of travel.
 */
export function wheelZoom(deltaY: number, deltaMode: number, ctrlKey: boolean) {
	// Mice scroll in lines or in large pixel steps; trackpads send small pixel deltas.
	const notch = !ctrlKey && (deltaMode !== 0 || Math.abs(deltaY) >= 50);
	if (notch) return { factor: deltaY < 0 ? 2 : 0.5, animate: true };
	return { factor: 2 ** (-deltaY / 100), animate: false };
}

export const isTap = (
	landed: { x: number; y: number; at: number },
	x: number,
	y: number,
	at: number
) => Math.hypot(x - landed.x, y - landed.y) < TAP_RANGE && at - landed.at < TAP_MS;

/**
 * Two fingers, measured from where they started rather than from the last event, so the map
 * point between them stays between them however fast they move.
 */
export function pinchView(anchor: View, from: Point[], to: Point[], box: Box): View {
	const [a, b] = from;
	const [c, d] = to;
	const spread = Math.hypot(a.x - b.x, a.y - b.y);
	const factor = spread ? Math.hypot(c.x - d.x, c.y - d.y) / spread : 1;
	const k = Math.min(MAX_ZOOM, Math.max(1, anchor.k * factor));
	const ratio = k / anchor.k;
	const start = pointerIn(box, (a.x + b.x) / 2, (a.y + b.y) / 2);
	const now = pointerIn(box, (c.x + d.x) / 2, (c.y + d.y) / 2);
	return clampView(
		{
			k,
			x: now.x - (start.x - anchor.x) * ratio,
			y: now.y - (start.y - anchor.y) * ratio
		},
		box
	);
}

/** The finger's speed at the moment it lifted, in pixels per millisecond. */
export function flingVelocity(trail: Gesture["trail"], at: number): Point {
	const last = trail.at(-1);
	const first = trail.find((sample) => last && last.at - sample.at <= FLING_WINDOW_MS);
	if (!last || !first || last === first || at - last.at > FLING_REST_MS) return { x: 0, y: 0 };
	const time = last.at - first.at;
	return { x: (last.x - first.x) / time, y: (last.y - first.y) / time };
}

/** One frame of a glide: exponential, so its length does not depend on the frame rate. */
export function flingStep(velocity: number, ms: number) {
	const decay = Math.exp(-ms / FLING_MS);
	return { velocity: velocity * decay, distance: velocity * FLING_MS * (1 - decay) };
}

/**
 * The transform, in screen pixels from the svg's corner, that makes what `base` painted
 * look like `live`.
 */
export function layerTransform(base: View, live: View, box: { width: number; height: number }) {
	const unit = VIEW.w / box.width;
	const pad = (box.height - VIEW.h / unit) / 2;
	const scale = live.k / base.k;
	return {
		scale,
		x: (scale * (VIEW.x - base.x) + live.x - VIEW.x) / unit,
		y: (scale * (VIEW.y - base.y) + live.y - VIEW.y) / unit + pad * (1 - scale)
	};
}

/** `outline` is the hovered province's shape, drawn again above every other province. */
type Tip = { id: string; left: number; top: number; outline: string };

function Tooltip({ province }: { province: MapProvince }) {
	const percent = province.percent ?? 0;
	return (
		<>
			<div className="flex items-center gap-1.5 font-display text-[10px] leading-[1.2] font-semibold tracking-label text-ink-500 uppercase">
				<Dot size={8} className={GROUP_TEXT[province.group]} />
				Kawasan {GROUP_NAME[province.group]}
			</div>
			<div className="font-display text-body-md leading-[1.2] font-semibold text-ink-1000">
				{province.name}
			</div>
			{province.percent === null ? (
				<div className="font-sans text-micro leading-[1.4] text-ink-500">
					Belum ada materi.
				</div>
			) : (
				<>
					<div className="flex items-baseline gap-1.5">
						<b className="font-display text-body-lg leading-none font-bold">
							{percent}%
						</b>
						<span className="font-sans text-micro leading-[1.3] text-ink-700">
							{province.mastered} dari {province.total} kode dikuasai
						</span>
					</div>
					<div className="h-1 overflow-hidden rounded-xs bg-ink-100">
						<i className="block h-full bg-go-500" style={{ width: `${percent}%` }} />
					</div>
				</>
			)}
			<div className="flex flex-wrap gap-1.5">
				{province.codes.map((code) => (
					<CodeChip key={code} code={code} group={province.group} size="xs" />
				))}
			</div>
		</>
	);
}

/** The phone's answer to hover: the tapped province's details, under the map. */
function Selection({ id, province }: { id: string; province: MapProvince }) {
	const percent = province.percent ?? 0;
	return (
		<div
			aria-live="polite"
			className="flex flex-col gap-2.5 border-t border-hairline px-4 pt-3.5 pb-4 lg:hidden"
		>
			<div className="flex items-center gap-1.5 type-label text-ink-500">
				<Dot size={8} className={GROUP_TEXT[province.group]} />
				Kawasan {GROUP_NAME[province.group]}
			</div>
			<div className="font-display text-subhead leading-[1.2] font-semibold text-ink-1000">
				{province.name}
			</div>
			{province.percent === null ? (
				<div className="font-sans text-body-sm leading-[1.3] text-ink-500">
					Belum ada materi.
				</div>
			) : (
				<>
					<div className="flex items-baseline gap-1.5">
						<b className="font-display text-heading leading-none font-bold">
							{percent}%
						</b>
						<span className="font-sans text-body-sm leading-[1.3] text-ink-700">
							{province.mastered} dari {province.total} kode dikuasai
						</span>
					</div>
					<div className="h-1 overflow-hidden rounded-xs bg-ink-100">
						<i className="block h-full bg-go-500" style={{ width: `${percent}%` }} />
					</div>
				</>
			)}
			<div className="flex flex-wrap gap-1.5">
				{province.codes.map((code) => (
					<CodeLink key={code} code={code} group={province.group} size="touch" />
				))}
			</div>
			<Button variant="secondary" size="sm" href={referenceHref("provinsi", id)}>
				Lihat di Referensi
			</Button>
		</div>
	);
}

function ZoomButton({
	icon,
	label,
	onClick
}: {
	icon: IconName;
	label: string;
	onClick: () => void;
}) {
	return (
		// The wrapper is the button group's child, so the dividing borders sit on it.
		<LabelTip
			content={label}
			className="flex border-0 border-ink-200 not-first:border-l lg:not-first:border-t lg:not-first:border-l-0"
		>
			<button
				type="button"
				aria-label={label}
				onClick={onClick}
				className="grid size-7.5 cursor-pointer place-items-center bg-paper-0 hover:bg-paper-50 focus-visible:outline-offset-[-3px] lg:size-10"
			>
				<Icon
					name={icon}
					size={null}
					className={icon === "rotate-ccw" ? "size-4" : "size-3.5 lg:size-4.5"}
				/>
			</button>
		</LabelTip>
	);
}

export function MasteryMap({
	provinces,
	loading = false,
	className = "h-52.5 lg:h-105"
}: {
	provinces: Record<string, MapProvince>;
	/** The land as a skeleton until the data is in; on a phone, no selection and no input either. */
	loading?: boolean;
	/** Height of the map box. */
	className?: string;
}) {
	const [source, setSource] = useState("");
	const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
	const [animate, setAnimate] = useState(false);
	const [tip, setTip] = useState<Tip | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const router = useRouter();
	const dragged = useRef(false);
	// The province under the first finger: later events no longer say what it landed on.
	const pressed = useRef<string | null>(null);
	const landed = useRef({ x: 0, y: 0, at: 0 });
	// React state and the land's own transforms stay put during a gesture: redrawing the map for
	// every finger move is what a phone cannot keep up with. The svg moves as one GPU layer instead.
	const gesture = useRef<Gesture | null>(null);
	const fling = useRef(0);
	const redraw = useRef<ReturnType<typeof setTimeout>>(undefined);
	const label = useRef<HTMLDivElement>(null);
	const svg = useRef<SVGSVGElement>(null);
	const wrap = useRef<HTMLDivElement>(null);
	const box = useRef<HTMLDivElement>(null);
	// Every finger or mouse button down on the map: one pans, two pinch.
	const pointers = useRef(new Map<number, Point>());

	useEffect(() => {
		let live = true;
		fetch("/map.svg")
			.then((response) => response.text())
			.then((text) => live && setSource(text))
			.catch(() => live && setSource(""));
		return () => {
			live = false;
		};
	}, []);

	const { markup, outlines } = useMemo(() => {
		if (!source) return { markup: "", outlines: new Map<string, string>() };
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		const outlines = new Map<string, string>();
		for (const path of doc.querySelectorAll("path[id]")) {
			path.setAttribute("fill", FILLS[fillStep(provinces[path.id]?.percent ?? null)]);
			outlines.set(path.id, path.getAttribute("d") ?? "");
		}
		return { markup: doc.documentElement.innerHTML, outlines };
	}, [source, provinces]);

	// The browser sends no pointerleave when the map moves out from under a still cursor
	// (scrolling) or when focus leaves the window, so the tooltip would be left behind.
	useEffect(() => {
		const clear = () => setTip(null);
		window.addEventListener("blur", clear);
		window.addEventListener("scroll", clear, { capture: true, passive: true });
		document.documentElement.addEventListener("mouseleave", clear);
		return () => {
			window.removeEventListener("blur", clear);
			window.removeEventListener("scroll", clear, { capture: true });
			document.documentElement.removeEventListener("mouseleave", clear);
		};
	}, []);

	const zoomButton = (factor: number | null) => {
		settle();
		setAnimate(true);
		setTip(null);
		const rect = wrap.current!.getBoundingClientRect();
		setView((current) =>
			factor === null
				? { k: 1, x: 0, y: 0 }
				: zoomAt(current, factor, VIEW.w / 2 + VIEW.x, VIEW.h / 2 + VIEW.y, rect)
		);
	};

	const showTip = (event: React.PointerEvent) => {
		const path = (event.target as Element).closest("path[id]");
		const rect = wrap.current!.getBoundingClientRect();
		if (!path || !provinces[path.id] || pointers.current.size) return setTip(null);
		const width = box.current?.offsetWidth ?? 200;
		const height = box.current?.offsetHeight ?? 120;
		let left = event.clientX - rect.left + 16;
		let top = event.clientY - rect.top + 16;
		if (left + width > rect.width - 8) left = event.clientX - rect.left - width - 16;
		if (top + height > rect.height - 8)
			top = Math.max(8, event.clientY - rect.top - height - 16);
		setTip({ id: path.id, left, top, outline: path.getAttribute("d") ?? "" });
	};

	const paint = (run: Gesture) => {
		const layer = layerTransform(run.base, run.live, run.box);
		svg.current!.style.transform = `translate(${layer.x}px, ${layer.y}px) scale(${layer.scale})`;
		const percent = `${Math.round(run.live.k * 100)}%`;
		// textContent would replace the text node, which restyles the box on every finger move.
		const text = label.current!.firstChild!;
		if (text.nodeValue !== percent) text.nodeValue = percent;
	};

	const settle = () => {
		const run = gesture.current;
		if (!run) return;
		clearTimeout(redraw.current);
		redraw.current = undefined;
		cancelAnimationFrame(fling.current);
		fling.current = 0;
		gesture.current = null;
		// In this frame: the layer must not let go before the land is drawn where it was showing.
		flushSync(() => setView(run.live));
		svg.current!.style.transform = "";
	};

	// A pan needs no redraw at all: the layer already holds the land, as sharp as it was.
	const sharpen = (latest: number, now: number) => {
		redraw.current = undefined;
		const run = gesture.current;
		// A pinch still running would only blur it again; its fingers ask again when they lift.
		if (!run || run.live.k === run.base.k || pointers.current.size > 1) return;
		const moved = run.trail.at(-1)?.at ?? 0;
		const moving =
			fling.current !== 0 || (pointers.current.size && now - moved < FINGER_STILL_MS);
		if (moving && now < latest) {
			redraw.current = setTimeout(() => sharpen(latest, performance.now()), REDRAW_RETRY_MS);
			return;
		}
		flushSync(() => setView(run.live));
		run.base = run.live;
		paint(run);
	};

	const glide = (run: Gesture, speed: Point) => {
		let { x: vx, y: vy } = speed;
		let last = performance.now();
		const frame = (now: number) => {
			// The frame's clock can start just before the call that asked for it.
			const ms = Math.max(0, now - last);
			const across = flingStep(vx, ms);
			const down = flingStep(vy, ms);
			last = now;
			const unit = VIEW.w / run.box.width;
			const wanted = {
				...run.live,
				x: run.live.x + across.distance * unit,
				y: run.live.y + down.distance * unit
			};
			run.live = clampView(wanted, run.box);
			vx = run.live.x === wanted.x ? across.velocity : 0;
			vy = run.live.y === wanted.y ? down.velocity : 0;
			paint(run);
			fling.current = Math.hypot(vx, vy) >= FLING_STOP ? requestAnimationFrame(frame) : 0;
		};
		fling.current = requestAnimationFrame(frame);
	};

	const begin = (x: number, y: number, at: number, target: Element) => {
		// A touch that stops a glide only stops it.
		dragged.current = fling.current !== 0;
		cancelAnimationFrame(fling.current);
		fling.current = 0;
		landed.current = { x, y, at };
		pressed.current = target.closest("path[id]")?.id ?? null;
		const live = gesture.current?.live ?? view;
		gesture.current = {
			base: gesture.current?.base ?? view,
			live,
			box: wrap.current!.getBoundingClientRect(),
			anchor: live,
			from: [],
			trail: []
		};
		setAnimate(false);
		setTip(null);
	};

	const reanchor = () => {
		const run = gesture.current;
		if (!run) return;
		run.anchor = run.live;
		run.from = [...pointers.current.values()];
		run.trail = [];
	};

	const follow = (at: number) => {
		const run = gesture.current;
		if (!run) return;
		const [a, b] = [...pointers.current.values()];
		if (b) run.live = pinchView(run.anchor, run.from, [a, b], run.box);
		else {
			if (!isTap(landed.current, a.x, a.y, landed.current.at)) dragged.current = true;
			const unit = VIEW.w / run.box.width;
			run.live = clampView(
				{
					...run.anchor,
					x: run.anchor.x + (a.x - run.from[0].x) * unit,
					y: run.anchor.y + (a.y - run.from[0].y) * unit
				},
				run.box
			);
			run.trail = [...run.trail.slice(-15), { ...a, at }];
		}
		paint(run);
	};

	const lift = (at: number) => {
		const run = gesture.current;
		if (!run) return;
		const speed = flingVelocity(run.trail, at);
		if (dragged.current && Math.hypot(speed.x, speed.y) >= FLING_START) glide(run, speed);
	};

	const pick = (
		x: number,
		y: number,
		at: number,
		{ button, metaKey, ctrlKey }: { button: number; metaKey: boolean; ctrlKey: boolean }
	) => {
		const id = pressed.current;
		if (dragged.current || !isTap(landed.current, x, y, at) || !id || !provinces[id]) return;
		// From lg up there is no selection panel: a click opens the province instead.
		const href = referenceHref("provinsi", id);
		if (!window.matchMedia("(min-width: 64rem)").matches) setSelected(id);
		else if (button !== 0) return;
		else if (metaKey || ctrlKey) window.open(href, "_blank");
		else router.push(href);
	};

	const touchStarted = useEffectEvent((event: TouchEvent) => {
		if (event.cancelable) event.preventDefault();
		// A finger whose touchend never reached us.
		const down = new Set(Array.from(event.touches, (touch) => touch.identifier));
		for (const id of pointers.current.keys()) if (!down.has(id)) pointers.current.delete(id);
		for (const touch of Array.from(event.changedTouches)) {
			if (pointers.current.has(touch.identifier)) continue;
			if (pointers.current.size) dragged.current = true;
			else begin(touch.clientX, touch.clientY, event.timeStamp, touch.target as Element);
			pointers.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
		}
		reanchor();
	});

	const touchMoved = useEffectEvent((event: TouchEvent) => {
		if (event.cancelable) event.preventDefault();
		for (const touch of Array.from(event.touches))
			if (pointers.current.has(touch.identifier))
				pointers.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
		follow(event.timeStamp);
	});

	const touchEnded = useEffectEvent((event: TouchEvent) => {
		if (event.cancelable) event.preventDefault();
		for (const touch of Array.from(event.changedTouches)) {
			if (!pointers.current.delete(touch.identifier) || pointers.current.size) continue;
			if (event.type === "touchend")
				pick(touch.clientX, touch.clientY, event.timeStamp, {
					button: 0,
					metaKey: false,
					ctrlKey: false
				});
			lift(event.timeStamp);
		}
		if (pointers.current.size) reanchor();
		// Not on every lift, or flicking fast would keep pushing the redraw back.
		if (pointers.current.size < 2 && redraw.current === undefined) {
			const latest = performance.now() + REDRAW_LATEST_MS;
			redraw.current = setTimeout(() => sharpen(latest, performance.now()), REDRAW_MS);
		}
	});

	// Touch events, not pointer events: a browser that decides to scroll or zoom ends a pointer
	// gesture with pointercancel, but a touchstart it was told to leave alone stays the page's.
	// React's touch listeners are passive, so they could not tell it that.
	useEffect(() => {
		// The box, not the svg: the svg travels with the map, and a finger can land where it has left.
		const element = wrap.current;
		if (!element) return;
		const options = { passive: false };
		const started = (event: TouchEvent) => touchStarted(event);
		const moved = (event: TouchEvent) => touchMoved(event);
		const ended = (event: TouchEvent) => {
			touchEnded(event);
			if (!pointers.current.size) detach();
		};
		// On the document only for the length of a gesture: a pinch's second finger often lands
		// off the map, and a lasting listener here would make every scroll of the page wait for it.
		const detach = () => {
			document.removeEventListener("touchstart", started);
			document.removeEventListener("touchmove", moved);
			document.removeEventListener("touchend", ended);
			document.removeEventListener("touchcancel", ended);
		};
		const onMap = (event: TouchEvent) => {
			// Cancelling this touch would take the click away from the zoom buttons.
			if ((event.target as Element).closest("button")) return;
			started(event);
			document.addEventListener("touchstart", started, options);
			document.addEventListener("touchmove", moved, options);
			document.addEventListener("touchend", ended, options);
			document.addEventListener("touchcancel", ended, options);
		};
		// Safari's own pinch of the page.
		const noPageZoom = (event: Event) => event.preventDefault();
		element.addEventListener("touchstart", onMap, options);
		element.addEventListener("gesturestart", noPageZoom, options);
		return () => {
			element.removeEventListener("touchstart", onMap);
			element.removeEventListener("gesturestart", noPageZoom);
			detach();
			cancelAnimationFrame(fling.current);
			clearTimeout(redraw.current);
		};
	}, []);

	const settleNow = useEffectEvent(settle);

	// React's wheel listener is passive, so it cannot stop the page from scrolling.
	useEffect(() => {
		const element = svg.current;
		if (!element) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			if (pointers.current.size) return;
			settleNow();
			const rect = wrap.current!.getBoundingClientRect();
			const point = pointerIn(rect, event.clientX, event.clientY);
			const zoom = wheelZoom(event.deltaY, event.deltaMode, event.ctrlKey);
			setAnimate(zoom.animate);
			setTip(null);
			setView((current) => zoomAt(current, zoom.factor, point.x, point.y, rect));
		};
		element.addEventListener("wheel", onWheel, { passive: false });
		return () => element.removeEventListener("wheel", onWheel);
	}, []);

	// A parked layer is measured in the box's old pixels.
	useEffect(() => {
		const onResize = () => {
			const run = gesture.current;
			const width = wrap.current?.getBoundingClientRect().width;
			if (run && !pointers.current.size && width !== run.box.width) settleNow();
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	// A mouse or a stylus on a device with no touch events; every finger goes through those above.
	const notTouch = (event: React.PointerEvent) =>
		event.pointerType === "mouse" ||
		(event.pointerType === "pen" && !("ontouchstart" in window));

	const release = (event: React.PointerEvent) => {
		// Only a finger glides: a mouse stays where it put the map, ready for the next click.
		if (notTouch(event) && pointers.current.delete(event.pointerId)) settle();
	};

	const layerStyle = {
		transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
		transformOrigin: "0 0",
		transition: animate ? "transform 260ms var(--ease-out)" : "none"
	};

	return (
		<div>
			<div
				ref={wrap}
				className={`relative w-full touch-none overflow-hidden bg-paper-0 lg:rounded-sm ${loading ? "max-lg:pointer-events-none" : ""} ${className}`}
			>
				<svg
					ref={svg}
					role="img"
					aria-label="Peta Penguasaan per provinsi"
					viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
					// Overflow keeps all of the zoomed map on the layer a gesture moves; the box clips it.
					className="block size-full origin-top-left cursor-grab overflow-visible will-change-transform active:cursor-grabbing"
					onPointerDown={(event) => {
						if (!notTouch(event)) return;
						// A press whose pointerup never reached the map.
						pointers.current.clear();
						begin(
							event.clientX,
							event.clientY,
							event.timeStamp,
							event.target as Element
						);
						pointers.current.set(event.pointerId, {
							x: event.clientX,
							y: event.clientY
						});
						reanchor();
						// Keeps the drag going when the pointer slides past the map's edge.
						event.currentTarget.setPointerCapture(event.pointerId);
					}}
					onPointerMove={(event) => {
						if (!notTouch(event)) return;
						// Hover details are for a mouse; a phone shows the tapped province under the map.
						if (!pointers.current.has(event.pointerId))
							return event.pointerType === "mouse" && showTip(event);
						pointers.current.set(event.pointerId, {
							x: event.clientX,
							y: event.clientY
						});
						follow(event.timeStamp);
					}}
					onPointerUp={(event) => {
						if (!notTouch(event) || !pointers.current.has(event.pointerId)) return;
						// A mouse press can be as slow as it likes; only its distance counts.
						const at =
							event.pointerType === "mouse" ? landed.current.at : event.timeStamp;
						pick(event.clientX, event.clientY, at, event);
						release(event);
					}}
					onPointerCancel={release}
					onPointerLeave={(event) => {
						release(event);
						setTip(null);
					}}
				>
					{/* In the static page, so the land shows before any script has run to fetch the map. */}
					{(loading || !markup) && (
						<g style={layerStyle}>
							<mask id="map-land">
								<image href="/map.svg" width={1000} height={371} />
							</mask>
							<rect
								width={1000}
								height={371}
								mask="url(#map-land)"
								className="animate-skl fill-ink-100"
							/>
						</g>
					)}
					<g
						className="[&_path]:stroke-paper-0 [&_path]:[stroke-width:0.75] [&_path]:[stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]"
						style={layerStyle}
						// map.svg is our own build output (scripts/build-map.ts), served from this origin.
						dangerouslySetInnerHTML={{ __html: loading ? "" : markup }}
					/>
					{/* A stroke on the province itself is half hidden under the neighbours painted after it. */}
					{!loading && selected && provinces[selected] && (
						<g style={layerStyle} className="pointer-events-none lg:hidden">
							<path
								d={outlines.get(selected)}
								fill="none"
								className="stroke-ink-1000 [stroke-width:2] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
							/>
						</g>
					)}
					{tip && (
						<g style={layerStyle} className="pointer-events-none">
							<path
								d={tip.outline}
								fill="none"
								className="stroke-ink-1000 [stroke-width:1.5] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
							/>
						</g>
					)}
				</svg>
				<div className="absolute top-2.5 right-2.5 flex overflow-hidden rounded-sm border border-ink-1000 bg-paper-0 shadow-[2px_2px_0_var(--color-ink-1000)] transition-[box-shadow,translate] duration-90 ease-out has-[button:active]:translate-0.5 has-[button:active]:shadow-none lg:top-3 lg:right-3 lg:flex-col lg:shadow-block">
					<ZoomButton
						icon="plus"
						label="Perbesar"
						onClick={() => zoomButton(ZOOM_STEP)}
					/>
					<ZoomButton
						icon="minus"
						label="Perkecil"
						onClick={() => zoomButton(1 / ZOOM_STEP)}
					/>
					<ZoomButton
						icon="rotate-ccw"
						label="Kembalikan ukuran"
						onClick={() => zoomButton(null)}
					/>
				</div>
				<div
					ref={label}
					className="absolute bottom-3 left-3 font-mono text-micro leading-none font-medium text-ink-500 lg:right-3 lg:left-auto"
				>
					{`${Math.round(view.k * 100)}%`}
				</div>
				{tip && provinces[tip.id] && (
					<div
						ref={box}
						role="tooltip"
						className="pointer-events-none absolute flex max-w-60 min-w-45 flex-col gap-1.5 rounded-sm border border-ink-1000 bg-paper-0 px-3 py-2.5 shadow-block"
						style={{ left: tip.left, top: tip.top }}
					>
						<Tooltip province={provinces[tip.id]} />
					</div>
				)}
			</div>
			{!loading && selected && provinces[selected] && (
				<Selection id={selected} province={provinces[selected]} />
			)}
		</div>
	);
}
