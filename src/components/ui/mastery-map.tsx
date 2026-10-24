"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CodeChip } from "./code-chip";
import { GROUP_BG, GROUP_NAME, type GroupId } from "./groups";
import { Icon, type IconName } from "./icon";

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
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className="grid size-10 cursor-pointer place-items-center border-0 bg-paper-0 not-first:border-t not-first:border-ink-200 hover:bg-paper-50 focus-visible:outline-offset-[-3px]"
		>
			<Icon name={icon} size={icon === "rotate-ccw" ? 16 : 18} />
		</button>
	);
}

export function MasteryMap({
	provinces,
	className = "h-105"
}: {
	provinces: Record<string, MapProvince>;
	/** Height of the map box. */
	className?: string;
}) {
	const [source, setSource] = useState("");
	const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
	const [animate, setAnimate] = useState(false);
	const [tip, setTip] = useState<Tip | null>(null);
	const svg = useRef<SVGSVGElement>(null);
	const wrap = useRef<HTMLDivElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const drag = useRef<{ x: number; y: number } | null>(null);

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

	const markup = useMemo(() => {
		if (!source) return "";
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		for (const path of doc.querySelectorAll("path[id]"))
			path.setAttribute("fill", FILLS[fillStep(provinces[path.id]?.percent ?? null)]);
		return doc.documentElement.innerHTML;
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
		if (!path || !provinces[path.id] || drag.current) return setTip(null);
		const width = box.current?.offsetWidth ?? 200;
		const height = box.current?.offsetHeight ?? 120;
		let left = event.clientX - rect.left + 16;
		let top = event.clientY - rect.top + 16;
		if (left + width > rect.width - 8) left = event.clientX - rect.left - width - 16;
		if (top + height > rect.height - 8)
			top = Math.max(8, event.clientY - rect.top - height - 16);
		setTip({ id: path.id, left, top, outline: path.getAttribute("d") ?? "" });
	};

	const layerStyle = {
		transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
		transformOrigin: "0 0",
		transition: animate ? "transform 260ms var(--ease-out)" : "none"
	};

	return (
		<div
			ref={wrap}
			className={`relative w-full overflow-hidden rounded-sm bg-paper-0 ${className}`}
		>
			<svg
				ref={svg}
				role="img"
				aria-label="Peta Penguasaan per provinsi"
				viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
				className="block size-full cursor-grab touch-none active:cursor-grabbing"
				onPointerDown={(event) => {
					drag.current = { x: event.clientX, y: event.clientY };
					setAnimate(false);
					setTip(null);
				}}
				onPointerMove={(event) => {
					if (!drag.current) return showTip(event);
					const scale = unit();
					const dx = (event.clientX - drag.current.x) * scale;
					const dy = (event.clientY - drag.current.y) * scale;
					drag.current = { x: event.clientX, y: event.clientY };
					setView((current) =>
						clamp({ ...current, x: current.x + dx, y: current.y + dy })
					);
				}}
				onPointerUp={() => (drag.current = null)}
				onPointerLeave={() => {
					drag.current = null;
					setTip(null);
				}}
			>
				<g
					className="[&_path]:stroke-paper-0 [&_path]:[stroke-width:0.75] [&_path]:[stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]"
					style={layerStyle}
					// map.svg is our own build output (scripts/build-map.ts), served from this origin.
					dangerouslySetInnerHTML={{ __html: markup }}
				/>
				{/* A stroke on the province itself is half hidden under the neighbours painted after it. */}
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
			<div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-sm border border-ink-1000 bg-paper-0 shadow-block transition-[box-shadow,translate] duration-90 ease-out has-[button:active]:translate-0.5 has-[button:active]:shadow-none">
				<ZoomButton icon="plus" label="Perbesar" onClick={() => zoomButton(ZOOM_STEP)} />
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
			<div className="absolute right-3 bottom-3 font-mono text-micro leading-none font-medium text-ink-500">
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
	);
}
