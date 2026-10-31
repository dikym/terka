"use client";

import { useEffect } from "react";

let locks = 0;
let release: (() => void) | undefined;

const scrollParent = (target: EventTarget | null) => {
	for (
		let node = target instanceof Element ? target : null;
		node && node !== document.body;
		node = node.parentElement
	) {
		const { overflowY } = getComputedStyle(node);
		if (
			(overflowY === "auto" || overflowY === "scroll") &&
			node.scrollHeight > node.clientHeight
		)
			return node;
	}
	return null;
};

/**
 * Freezes the page behind an open dialog; nested dialogs share one lock. `overflow: hidden` is not
 * enough on iOS Safari, which still scrolls the page by touch, so a touch that is not inside a box
 * with something to scroll is stopped, and scroll chaining out of boxes is turned off. The rule
 * goes in a <style> element because iOS 26 only honours it when it is in place before touchstart.
 */
export function useScrollLock() {
	useEffect(() => {
		if (locks++ === 0) {
			const root = document.documentElement;
			const { overflow, paddingRight } = root.style;
			const gap = window.innerWidth - root.clientWidth;
			root.style.overflow = "hidden";
			// Without the padding the layout jumps sideways when the scrollbar disappears.
			if (gap > 0) root.style.paddingRight = `${gap}px`;
			const contain = document.createElement("style");
			contain.textContent = "@layer { * { overscroll-behavior: contain; } }";
			document.head.prepend(contain);
			let scrollable: Element | null = null;
			let selecting = false;
			const onTouchStart = (event: TouchEvent) => {
				scrollable = scrollParent(event.target);
				// Dragging inside the focused field moves the caret or the selection handles.
				selecting = event.target === document.activeElement;
			};
			const onTouchMove = (event: TouchEvent) => {
				if (event.touches.length > 1 || selecting || scrollable) return;
				if (event.cancelable) event.preventDefault();
			};
			const options = { capture: true, passive: false };
			document.addEventListener("touchstart", onTouchStart, options);
			document.addEventListener("touchmove", onTouchMove, options);
			release = () => {
				document.removeEventListener("touchstart", onTouchStart, options);
				document.removeEventListener("touchmove", onTouchMove, options);
				contain.remove();
				root.style.overflow = overflow;
				root.style.paddingRight = paddingRight;
			};
		}
		return () => {
			if (--locks === 0) release?.();
		};
	}, []);
}
