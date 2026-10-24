"use client";

import { useEffect, useState } from "react";

/** Hands back `value` after a short delay, so every screen shows its skeleton first. */
export function useDummy<T>(value: T, delay = 600): T | null {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setReady(true), delay);
		return () => clearTimeout(timer);
	}, [delay]);
	return ready ? value : null;
}
