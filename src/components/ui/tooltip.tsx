"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHOW_AFTER_MS = 400;
const GAP = 10;
const EDGE = 8;
// Where the arrow points on a start-aligned tooltip, from the trigger's left edge.
const START_ARROW = 21;

/** Where the arrow should point and the room above and below the trigger, in viewport pixels. */
type Place = { x: number; above: number; below: number; align: "center" | "start" };

/**
 * A one-line label above its trigger, or below it when the viewport has no room: after a
 * 400 ms hover or on keyboard focus, gone on Esc or leave. Fixed to the viewport, so a
 * scrolling list cannot clip it. Touch never opens it.
 * Portaled to the body: an ancestor's mask or filter would otherwise still clip it.
 */
export function Tooltip({
	content,
	kbd,
	align = "center",
	focusable = false,
	truncatedOnly = false,
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
		const flip = place.above - tip.offsetHeight < EDGE;
		tip.style.top = `${flip ? place.below : place.above - tip.offsetHeight}px`;
		arrow.current.style.top = flip ? "auto" : "100%";
		arrow.current.style.bottom = flip ? "100%" : "auto";
		arrow.current.style.rotate = flip ? "180deg" : "";
		const width = tip.offsetWidth;
		const wanted = place.align === "center" ? place.x - width / 2 : place.x - START_ARROW;
		const left = Math.round(Math.max(EDGE, Math.min(wanted, window.innerWidth - width - EDGE)));
		tip.style.left = `${left}px`;
		tip.style.visibility = "visible";
		arrow.current.style.left = `${Math.round(place.x - left - 6)}px`;
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
		window.addEventListener("scroll", close, true);
		return () => {
			document.removeEventListener("keydown", onKey);
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
			onPointerLeave={close}
			onPointerDown={close}
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
						className="pointer-events-none fixed z-60 inline-flex max-w-72 items-center gap-2 rounded-sm border border-ink-1000 bg-paper-0 px-2.5 py-1.5 font-sans text-body-sm leading-4 font-medium text-pretty text-ink-900 shadow-overlay"
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
							{/* Reaches half a pixel into the box, so no sliver of border survives at a
						    fractional zoom; its sides run along the inner edges of the legs. */}
							<path d="M-0.5 -0.5 L6 6 L12.5 -0.5 Z" fill="var(--color-paper-0)" />
							<path
								d="M0 0.5 L6 6.5 L12 0.5"
								fill="none"
								stroke="var(--color-ink-1000)"
								strokeWidth={Math.SQRT1_2}
							/>
						</svg>
					</span>,
					document.body
				)}
		</span>
	);
}
