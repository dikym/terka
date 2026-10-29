"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHOW_AFTER_MS = 400;
const TAP_SHOWS_MS = 2_500;
const GAP = 10;
const EDGE = 8;
// Where the arrow points on a start-aligned tooltip, from the trigger's left edge.
const START_ARROW = 21;
const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 7;

/** Where the arrow should point and the room above and below the trigger, in viewport pixels. */
type Place = { x: number; above: number; below: number; align: "center" | "start" };

/**
 * A one-line label above its trigger, or below it when the viewport has no room: after a
 * 400 ms hover or on keyboard focus, gone on Esc or leave. Fixed to the viewport, so a
 * scrolling list cannot clip it. Touch opens it only where `tap` is set.
 * Portaled to the body: an ancestor's mask or filter would otherwise still clip it.
 */
export function Tooltip({
	content,
	kbd,
	align = "center",
	focusable = false,
	truncatedOnly = false,
	tap = false,
	className = "inline-flex",
	children
}: {
	content: string;
	/** A keyboard shortcut shown after the text. */
	kbd?: string;
	/** "start" lines the tooltip up with the trigger's left edge, for text labels. */
	align?: "center" | "start";
	/** Makes the wrapper itself focusable, for a term that is not a control. */
	focusable?: boolean;
	/** Opens only while the trigger's text is cut off with an ellipsis. */
	truncatedOnly?: boolean;
	/** A tap shows it for a moment, for an icon a phone has no hover to explain. */
	tap?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	const id = useId();
	const anchor = useRef<HTMLSpanElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const box = useRef<HTMLSpanElement>(null);
	const arrow = useRef<SVGSVGElement>(null);
	const [place, setPlace] = useState<Place | null>(null);

	const open = () => {
		const trigger = anchor.current;
		if (!trigger || !content) return;
		const text = trigger.firstElementChild ?? trigger;
		if (truncatedOnly && text.scrollWidth <= text.clientWidth) return;
		const rect = trigger.getBoundingClientRect();
		setPlace({
			x: align === "center" ? rect.left + rect.width / 2 : rect.left + START_ARROW,
			// Whole pixels keep the border and the arrow sharp.
			above: Math.round(rect.top - GAP),
			below: Math.round(rect.bottom + GAP),
			align
		});
	};

	// Kept inside the viewport once its size is known; the arrow still points at the trigger.
	useLayoutEffect(() => {
		const tip = box.current;
		if (!place || !tip || !arrow.current) return;
		// At a fractional pixel ratio the browser rounds the border down to whole device pixels,
		// so everything is placed on the device grid and the arrow is drawn to the real border.
		const dpr = window.devicePixelRatio || 1;
		const snap = (value: number) => Math.round(value * dpr) / dpr;
		const rect = tip.getBoundingClientRect();
		const border = parseFloat(getComputedStyle(tip).borderTopWidth) || 1;
		const height = snap(ARROW_HEIGHT);
		const flip = place.above - rect.height < EDGE;
		tip.style.top = `${snap(flip ? place.below : place.above - rect.height)}px`;
		const svg = arrow.current;
		svg.style.top = flip ? "auto" : "100%";
		svg.style.bottom = flip ? "100%" : "auto";
		svg.setAttribute("height", String(height));
		svg.setAttribute("viewBox", `0 0 ${ARROW_WIDTH} ${height}`);
		// Flipped inside the svg: a CSS transform on the svg itself skips the pixel snapping the border gets.
		const [wedge, leg] = svg.querySelectorAll("path");
		svg.firstElementChild?.setAttribute(
			"transform",
			flip ? `matrix(1 0 0 -1 0 ${height})` : ""
		);
		const half = border / 2;
		const mid = ARROW_WIDTH / 2;
		wedge.setAttribute(
			"d",
			`M${-half} ${-half} L${mid} ${mid} L${ARROW_WIDTH + half} ${-half} Z`
		);
		leg.setAttribute("d", `M0 ${half} L${mid} ${mid + half} L${ARROW_WIDTH} ${half}`);
		leg.setAttribute("stroke-width", String(border * Math.SQRT1_2));
		const width = rect.width;
		const wanted = place.align === "center" ? place.x - width / 2 : place.x - START_ARROW;
		const left = snap(Math.max(EDGE, Math.min(wanted, window.innerWidth - width - EDGE)));
		tip.style.left = `${left}px`;
		tip.style.visibility = "visible";
		svg.style.left = `${snap(place.x - left - mid)}px`;
	}, [place]);
	const close = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
		setPlace(null);
	};

	useEffect(() => {
		if (!place) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", close);
		window.addEventListener("scroll", close, true);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", close);
			window.removeEventListener("scroll", close, true);
		};
	}, [place]);
	useEffect(() => close, []);

	return (
		<span
			ref={anchor}
			tabIndex={focusable ? 0 : undefined}
			aria-describedby={focusable && place ? id : undefined}
			onPointerEnter={(event) => {
				if (event.pointerType === "touch") return;
				timer.current = setTimeout(open, SHOW_AFTER_MS);
			}}
			onPointerLeave={(event) => {
				// A lifted finger always "leaves"; a tapped tooltip closes on its timer instead.
				if (tap && event.pointerType === "touch") return;
				close();
			}}
			onPointerDown={close}
			onPointerUp={(event) => {
				if (!tap || event.pointerType !== "touch") return;
				open();
				timer.current = setTimeout(close, TAP_SHOWS_MS);
			}}
			onFocus={(event) => {
				if ((event.target as HTMLElement).matches(":focus-visible")) open();
			}}
			onBlur={close}
			className={className}
		>
			{children}
			{place &&
				createPortal(
					<span
						ref={box}
						id={id}
						role="tooltip"
						style={{ visibility: "hidden" }}
						className="pointer-events-none fixed z-60 inline-flex max-w-72 items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-2.5 py-1.5 font-sans text-body-sm leading-4 font-medium text-ink-900 shadow-overlay"
					>
						{content}
						{kbd && (
							<kbd className="rounded-xs border border-ink-300 px-1.25 py-0.75 font-mono text-micro leading-none font-medium text-ink-1000">
								{kbd}
							</kbd>
						)}
						{/* A 45° line of width 1/√2 covers one pixel per row, as wide as the 1 px border.
					    Width 1 matches the border across the line but reads heavier: an antialiased
					    diagonal looks bolder than a crisp horizontal. It starts at the border's middle;
					    the paper wedge clears the whole border between. */}
						<svg
							ref={arrow}
							aria-hidden="true"
							width="12"
							height="7"
							viewBox="0 0 12 7"
							className="absolute block overflow-visible"
						>
							<g>
								{/* Reaches half a pixel into the box, so no sliver of border survives at a
							    fractional zoom; its sides run along the inner edges of the legs. The square
							    caps make each leg reach the border's outer edge, where the wedge erased it. */}
								<path
									d="M-0.5 -0.5 L6 6 L12.5 -0.5 Z"
									fill="var(--color-paper-0)"
								/>
								<path
									d="M0 0.5 L6 6.5 L12 0.5"
									fill="none"
									stroke="var(--color-ink-1000)"
									strokeWidth={Math.SQRT1_2}
									strokeLinecap="square"
								/>
							</g>
						</svg>
					</span>,
					document.body
				)}
		</span>
	);
}
