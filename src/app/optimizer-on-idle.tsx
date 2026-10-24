"use client";

import { useEffect } from "react";
import { optimizeInBackground } from "@/lib/optimizer/client";

// Starts only away from the session screen, so it never competes with a question on screen.
export function OptimizerOnIdle() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production" || location.pathname === "/sesi") return;
		const start = () => void optimizeInBackground().catch(() => {});
		if ("requestIdleCallback" in window) {
			const handle = requestIdleCallback(start, { timeout: 10_000 });
			return () => cancelIdleCallback(handle);
		}
		const handle = setTimeout(start, 2_000);
		return () => clearTimeout(handle);
	}, []);
	return null;
}
