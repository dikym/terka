"use client";

import { useEffect } from "react";

let locks = 0;
let release: (() => void) | undefined;

/** Freezes the page behind an open dialog; nested dialogs share one lock. */
export function useScrollLock() {
	useEffect(() => {
		if (locks++ === 0) {
			const root = document.documentElement;
			const { overflow, paddingRight } = root.style;
			const gap = window.innerWidth - root.clientWidth;
			root.style.overflow = "hidden";
			// Without the padding the layout jumps sideways when the scrollbar disappears.
			if (gap > 0) root.style.paddingRight = `${gap}px`;
			release = () => {
				root.style.overflow = overflow;
				root.style.paddingRight = paddingRight;
			};
		}
		return () => {
			if (--locks === 0) release?.();
		};
	}, []);
}
