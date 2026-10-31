"use client";

import { type RefObject, useEffect } from "react";

/**
 * Keeps a fixed overlay on the area the user can actually see. When the on-screen keyboard opens,
 * iOS Safari pans the visual viewport inside the layout viewport, so `inset-0` no longer lines up
 * with what is visible and the page behind shows through below the sheet.
 */
export function useVisualViewportFit(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const element = ref.current;
		const viewport = window.visualViewport;
		if (!element || !viewport) return;
		const sync = () => {
			if (viewport.scale !== 1) {
				element.style.top = "";
				element.style.left = "";
				element.style.width = "";
				element.style.height = "";
				return;
			}
			element.style.top = `${viewport.offsetTop}px`;
			element.style.left = `${viewport.offsetLeft}px`;
			element.style.width = `${viewport.width}px`;
			element.style.height = `${viewport.height}px`;
		};
		sync();
		viewport.addEventListener("resize", sync);
		viewport.addEventListener("scroll", sync);
		return () => {
			viewport.removeEventListener("resize", sync);
			viewport.removeEventListener("scroll", sync);
		};
	}, [ref]);
}
