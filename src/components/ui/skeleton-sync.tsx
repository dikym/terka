"use client";

import { useEffect } from "react";

/**
 * Keeps every skeleton on one pulse. React can swap a skeleton for an identical new element, as a
 * Suspense fallback does on hydrating, and a new element would start its pulse over: a visible
 * blink of the whole screen just before the content arrives.
 */
export function SkeletonSync() {
	useEffect(() => {
		let start: CSSNumberish | null = null;
		const sync = () => {
			for (const animation of document.getAnimations()) {
				if (!(animation instanceof CSSAnimation) || animation.animationName !== "skl")
					continue;
				start ??= animation.startTime;
				if (start !== null && animation.startTime !== start) animation.startTime = start;
			}
		};
		sync();
		// A mutation callback runs before the next paint, so a new skeleton never shows its first frame.
		const observer = new MutationObserver(() => {
			if (document.querySelector(".animate-skl")) sync();
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"]
		});
		return () => observer.disconnect();
	}, []);
	return null;
}
