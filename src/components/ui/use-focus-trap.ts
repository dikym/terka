"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab cycling inside a modal screen. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const root = ref.current;
			if (event.key !== "Tab" || !root) return;
			const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			const active = document.activeElement;
			if (!root.contains(active)) {
				event.preventDefault();
				first.focus();
			} else if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [ref]);
}
