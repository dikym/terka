"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { referenceHref } from "@/lib/view/reference";
import { Button } from "./button";
import { CodeChip, CodeLink } from "./code-chip";
import { GROUP_BG, GROUP_NAME, type GroupId } from "./groups";
import { Icon, type IconName } from "./icon";
import { Tooltip as LabelTip } from "./tooltip";

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
const ZOOM_STEP = 1.6;
const MAX_ZOOM = 10;

type View = { k: number; x: number; y: number };

function clamp({ k, x, y }: View): View {
	const scale = Math.min(MAX_ZOOM, Math.max(1, k));
	const minX = VIEW.w - VIEW.w * scale;
	const minY = VIEW.h - VIEW.h * scale;
	return {
		k: scale,
		x: Math.min(0, Math.max(minX, x)),
		y: Math.min(0, Math.max(minY, y))
	};
}

/** Zooms by `factor` keeping the point (px, py), in view units, still. */
const zoomAt = (view: View, factor: number, px: number, py: number) => {
	const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
	const ratio = k / view.k;
	return clamp({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio });
};

/** A client point inside the map, in view units. */
function pointerIn(element: SVGSVGElement, clientX: number, clientY: number) {
	const rect = element.getBoundingClientRect();
	const scale = VIEW.w / rect.width;
	const height = VIEW.w / (rect.width / rect.height);
	return {
		x: (clientX - rect.left) * scale,
		y: (clientY - rect.top) * scale - (height - VIEW.h) / 2
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

/** `outline` is the hovered province's shape, drawn again above every other province. */
type Tip = { id: string; left: number; top: number; outline: string };

function Tooltip({ province }: { province: MapProvince }) {
	const percent = province.percent ?? 0;
	return (
		<>
			<div className="flex items-center gap-1.5 font-display text-[10px] leading-[1.2] font-semibold tracking-label text-ink-500 uppercase">
				<span className={`size-2 rounded-full ${GROUP_BG[province.group]}`} />
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
							{province.mastered} dari {province.total} kartu Dikuasai
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
				<span className={`size-2 rounded-full ${GROUP_BG[province.group]}`} />
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
							{province.mastered} dari {province.total} kartu Dikuasai
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
	/** On a phone: grey provinces, no selection and no input until the data is in. */
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
	// The province under the first finger: the capture below sends the click to the map, not the path.
	const pressed = useRef<string | null>(null);
	const svg = useRef<SVGSVGElement>(null);
	const wrap = useRef<HTMLDivElement>(null);
	const box = useRef<HTMLDivElement>(null);
	// Every finger or mouse button down on the map: one pans, two pinch.
	const pointers = useRef(new Map<number, { x: number; y: number }>());

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

	// Pixel distances on screen, in view units.
	const unit = () => VIEW.w / (svg.current?.getBoundingClientRect().width || VIEW.w);

	// React's wheel listener is passive, so it cannot stop the page from scrolling.
	useEffect(() => {
		const element = svg.current;
		if (!element) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const point = pointerIn(element, event.clientX, event.clientY);
			const zoom = wheelZoom(event.deltaY, event.deltaMode, event.ctrlKey);
			setAnimate(zoom.animate);
			setTip(null);
			setView((current) => zoomAt(current, zoom.factor, point.x, point.y));
		};
		element.addEventListener("wheel", onWheel, { passive: false });
		return () => element.removeEventListener("wheel", onWheel);
	}, []);

	const zoomButton = (factor: number | null) => {
		setAnimate(true);
		setTip(null);
		setView((current) =>
			factor === null ? { k: 1, x: 0, y: 0 } : zoomAt(current, factor, VIEW.w / 2, VIEW.h / 2)
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

	const move = (event: React.PointerEvent) => {
		const points = pointers.current;
		const last = points.get(event.pointerId);
		// Hover details are for a mouse; a phone shows the tapped province under the map.
		if (!last) return event.pointerType === "mouse" && showTip(event);
		const [a, b] = [...points.values()];
		points.set(event.pointerId, { x: event.clientX, y: event.clientY });
		const scale = unit();
		if (!b) {
			const dx = (event.clientX - last.x) * scale;
			const dy = (event.clientY - last.y) * scale;
			if (dx || dy) dragged.current = true;
			return setView((current) =>
				clamp({ ...current, x: current.x + dx, y: current.y + dy })
			);
		}
		const [c, d] = [...points.values()];
		const before = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
		const after = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
		const spread = Math.hypot(a.x - b.x, a.y - b.y);
		const factor = spread ? Math.hypot(c.x - d.x, c.y - d.y) / spread : 1;
		const center = pointerIn(svg.current!, before.x, before.y);
		dragged.current = true;
		setView((current) => {
			const zoomed = zoomAt(current, factor, center.x, center.y);
			return clamp({
				...zoomed,
				x: zoomed.x + (after.x - before.x) * scale,
				y: zoomed.y + (after.y - before.y) * scale
			});
		});
	};

	const release = (event: React.PointerEvent) => pointers.current.delete(event.pointerId);

	const layerStyle = {
		transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
		transformOrigin: "0 0",
		transition: animate ? "transform 260ms var(--ease-out)" : "none"
	};

	return (
		<div>
			<div
				ref={wrap}
				// A phone's map box is taller than the map, so the map is centred in it.
				className={`relative flex w-full flex-col justify-center overflow-hidden bg-paper-0 lg:block lg:rounded-sm ${loading ? "max-lg:pointer-events-none" : ""} ${className}`}
			>
				<svg
					ref={svg}
					role="img"
					aria-label="Peta Penguasaan per provinsi"
					viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
					// Overflow shows the zoomed map in the room above it; the box still clips at its edges.
					className="block aspect-[1080/403] w-full cursor-grab touch-none active:cursor-grabbing max-lg:overflow-visible lg:aspect-auto lg:size-full"
					onPointerDown={(event) => {
						// A new gesture's first finger: drop any finger whose pointerup never reached the map.
						if (event.isPrimary) {
							pointers.current.clear();
							pressed.current =
								(event.target as Element).closest("path[id]")?.id ?? null;
						}
						if (!pointers.current.size) dragged.current = false;
						pointers.current.set(event.pointerId, {
							x: event.clientX,
							y: event.clientY
						});
						// Keeps the drag going when the finger slides past the map's edge.
						event.currentTarget.setPointerCapture(event.pointerId);
						setAnimate(false);
						setTip(null);
					}}
					onPointerMove={move}
					onPointerUp={(event) => {
						release(event);
						const id = pressed.current;
						if (!pointers.current.size && !dragged.current && id && provinces[id]) {
							// From lg up there is no selection panel: a click opens the province instead.
							const href = referenceHref("provinsi", id);
							if (!window.matchMedia("(min-width: 64rem)").matches) setSelected(id);
							else if (event.button !== 0) return;
							else if (event.metaKey || event.ctrlKey) window.open(href, "_blank");
							else router.push(href);
						}
					}}
					onPointerCancel={release}
					onPointerLeave={(event) => {
						release(event);
						setTip(null);
					}}
				>
					<g
						className={`${loading ? "max-lg:[&_path]:fill-ink-100" : ""} [&_path]:stroke-paper-0 [&_path]:[stroke-width:0.75] [&_path]:[stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]`}
						style={layerStyle}
						// map.svg is our own build output (scripts/build-map.ts), served from this origin.
						dangerouslySetInnerHTML={{ __html: markup }}
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
				<div className="absolute bottom-3 left-3 font-mono text-micro leading-none font-medium text-ink-500 lg:right-3 lg:left-auto">
					{Math.round(view.k * 100)}%
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
