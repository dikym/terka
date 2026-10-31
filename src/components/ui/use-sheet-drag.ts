"use client";

import { type RefObject, useEffect, useRef } from "react";

const SLOP = 6;
const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.5;
const SETTLE_MS = 180;

/** True when the touch started inside a box, up to and including the panel, that is scrolled down. */
function scrolledBetween(target: EventTarget | null, panel: HTMLElement) {
	for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
		if (node.scrollTop > 0) return true;
		if (node === panel) return false;
	}
	return false;
}

/**
 * Lets a phone bottom sheet be pulled down from its top edge and dismissed by a long or fast swipe.
 * The scrim lightens with the pull and fades out while the sheet sinks.
 */
export function useSheetDrag(
	ref: RefObject<HTMLElement | null>,
	scrimRef: RefObject<HTMLElement | null>,
	onDismiss: () => void
) {
	const latest = useRef(onDismiss);
	useEffect(() => {
		latest.current = onDismiss;
	});
	useEffect(() => {
		const panel = ref.current;
		const scrim = scrimRef.current;
		if (!panel || !scrim) return;
		const phone = window.matchMedia("(max-width: 1023.98px)");
		let startY = 0;
		let startTime = 0;
		let offset = 0;
		let tracking = false;
		let dragging = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const settle = (transform: string, opacity: string) => {
			panel.style.transition = `transform ${SETTLE_MS}ms ease-out`;
			panel.style.transform = transform;
			scrim.style.transition = `opacity ${SETTLE_MS}ms ease-out`;
			scrim.style.opacity = opacity;
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
			scrim.style.transition = "none";
		};
		const onMove = (event: TouchEvent) => {
			if (!tracking) return;
			const delta = event.touches[0].clientY - startY;
			if (!dragging) {
				// Scrolling the sheet's own content wins over pulling it down.
				if (scrolledBetween(event.target, panel) || delta < -SLOP) {
					tracking = false;
					return;
				}
				if (delta < SLOP) return;
				dragging = true;
				// Pulling the sheet ends typing: a focused field dragged behind the keyboard makes iOS
				// pan the whole page to the caret on the next keystroke.
				const focused = document.activeElement;
				if (focused instanceof HTMLElement && panel.contains(focused)) focused.blur();
			}
			if (event.cancelable) event.preventDefault();
			offset = Math.max(0, delta - SLOP);
			panel.style.transform = `translateY(${offset}px)`;
			scrim.style.opacity = `${Math.max(0, 1 - offset / panel.offsetHeight)}`;
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
				// A full screen, not the sheet's own height, so it sinks behind the keyboard too.
				settle("translateY(100lvh)", "0");
				timer = setTimeout(() => latest.current(), SETTLE_MS);
			} else {
				settle("", "");
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
	}, [ref, scrimRef]);
}
