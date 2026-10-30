"use client";

import { useEffect, useRef, useState } from "react";

const FADE_PX = 4;
// Smoothstep alpha at each stop: a short linear fade shows a hard line where it ends.
export const FADE_RAMP = [0, 1, 2, 3, 4, 5, 6].map((step) => {
	const t = step / 6;
	return [Math.round(t * t * (3 - 2 * t) * 1000) / 1000, t] as const;
});

/**
 * A scroll box that fades only the edges with more rows behind them. Give it a max height through
 * `className`. `centerOn` is a selector for a row to keep in the middle of the box.
 */
export function FadeScroll({
	children,
	className = "",
	centerOn
}: {
	children: React.ReactNode;
	className?: string;
	centerOn?: string;
}) {
	const scroller = useRef<HTMLDivElement>(null);
	const [more, setMore] = useState({ above: false, below: false });
	const measure = () => {
		const box = scroller.current;
		if (!box) return;
		const above = box.scrollTop > 0;
		// One pixel of slack: scrollTop is fractional at some zoom levels.
		const below = box.scrollTop + box.clientHeight < box.scrollHeight - 1;
		setMore((prev) => (prev.above === above && prev.below === below ? prev : { above, below }));
	};
	// The row sits in the middle of the box, without moving the page around it.
	useEffect(() => {
		const box = scroller.current;
		const row = centerOn ? box?.querySelector<HTMLElement>(centerOn) : null;
		if (box && row) box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
	}, [centerOn]);
	// The rows can change without a scroll, so the edges are measured after every render.
	useEffect(measure);
	useEffect(() => {
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);
	const edge = (on: boolean, at: (px: number) => string) =>
		on
			? FADE_RAMP.map(([alpha, t]) => `rgb(0 0 0 / ${alpha}) ${at(t * FADE_PX)}`)
			: [`black ${at(0)}`];
	const stops = [
		...edge(more.above, (px) => `${px}px`),
		...edge(more.below, (px) => `calc(100% - ${px}px)`).reverse()
	];
	return (
		<div
			ref={scroller}
			onScroll={measure}
			style={{ maskImage: `linear-gradient(to bottom, ${stops.join(", ")})` }}
			className={`relative overflow-y-auto ${className}`}
		>
			{children}
		</div>
	);
}
