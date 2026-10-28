"use client";

import { type RefObject, useEffect, useRef } from "react";

const SLOP = 6;
const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.5;
const SETTLE_MS = 180;

/** Lets a phone bottom sheet be pulled down from its top edge and dismissed by a long or fast swipe. */
export function useSheetDrag(ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
	const latest = useRef(onDismiss);
	useEffect(() => {
		latest.current = onDismiss;
	});
	useEffect(() => {
		const panel = ref.current;
		if (!panel) return;
		const phone = window.matchMedia("(max-width: 1023.98px)");
		let startY = 0;
		let startTime = 0;
		let offset = 0;
		let tracking = false;
		let dragging = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const settle = (transform: string) => {
			panel.style.transition = `transform ${SETTLE_MS}ms ease-out`;
			panel.style.transform = transform;
		};
		const onStart = (event: TouchEvent) => {
			if (!phone.matches || event.touches.length !== 1) return;
			clearTimeout(timer);
			tracking = true;
			dragging = false;
			offset = 0;
			startY = event.touches[0].clientY;
			startTime = event.timeStamp;
			panel.style.transition = "none";
		};
		const onMove = (event: TouchEvent) => {
			if (!tracking) return;
			const delta = event.touches[0].clientY - startY;
			if (!dragging) {
				// Scrolling the sheet's own content wins over pulling it down.
				if (panel.scrollTop > 0 || delta < -SLOP) {
					tracking = false;
					return;
				}
				if (delta < SLOP) return;
				dragging = true;
			}
			if (event.cancelable) event.preventDefault();
			offset = Math.max(0, delta - SLOP);
			panel.style.transform = `translateY(${offset}px)`;
		};
		const onEnd = (event: TouchEvent) => {
			if (!dragging) {
				tracking = false;
				return;
			}
			tracking = false;
			dragging = false;
			const elapsed = Math.max(1, event.timeStamp - startTime);
			if (offset > DISMISS_DISTANCE || offset / elapsed > DISMISS_VELOCITY) {
				settle("translateY(100%)");
				timer = setTimeout(() => latest.current(), SETTLE_MS);
			} else {
				settle("");
			}
		};

		panel.addEventListener("touchstart", onStart, { passive: true });
		panel.addEventListener("touchmove", onMove, { passive: false });
		panel.addEventListener("touchend", onEnd);
		panel.addEventListener("touchcancel", onEnd);
		return () => {
			clearTimeout(timer);
			panel.removeEventListener("touchstart", onStart);
			panel.removeEventListener("touchmove", onMove);
			panel.removeEventListener("touchend", onEnd);
			panel.removeEventListener("touchcancel", onEnd);
		};
	}, [ref]);
}
