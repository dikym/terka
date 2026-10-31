"use client";

import { type RefObject, useLayoutEffect } from "react";

/**
 * Lays an absolutely positioned overlay over the area the user can actually see. It is absolute in
 * the document, not fixed, because iOS 26 will not paint fixed content below the visual viewport:
 * a fixed sheet would be cut off at the translucent keyboard accessory bar instead of reaching
 * down behind the keyboard. When pinch-zoomed it covers the layout viewport instead.
 */
export function useVisualViewportFit(ref: RefObject<HTMLElement | null>) {
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		const viewport = window.visualViewport;
		const html = document.documentElement;
		const sync = () => {
			if (viewport && viewport.scale === 1) {
				element.style.top = `${viewport.pageTop}px`;
				element.style.left = `${viewport.pageLeft}px`;
				element.style.width = `${viewport.width}px`;
				element.style.height = `${viewport.height}px`;
				return;
			}
			element.style.top = `${viewport ? viewport.pageTop - viewport.offsetTop : window.scrollY}px`;
			element.style.left = `${viewport ? viewport.pageLeft - viewport.offsetLeft : window.scrollX}px`;
			element.style.width = `${html.clientWidth}px`;
			element.style.height = `${html.clientHeight}px`;
		};
		sync();
		// The visual viewport fires no event when the document itself scrolls, so both are watched.
		viewport?.addEventListener("resize", sync);
		viewport?.addEventListener("scroll", sync);
		window.addEventListener("resize", sync);
		window.addEventListener("scroll", sync);
		return () => {
			viewport?.removeEventListener("resize", sync);
			viewport?.removeEventListener("scroll", sync);
			window.removeEventListener("resize", sync);
			window.removeEventListener("scroll", sync);
		};
	}, [ref]);
}
