import { LEGAL_FROM_SETTINGS, readFlag, useFlag, writeFlag } from "./flags";

// A page opened from a typed address, a bookmark or another site starts with a clean slate, so a
// mark left by an earlier visit in the same tab cannot leak into it.
if (typeof window !== "undefined") {
	const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
	if (entry?.type === "navigate" && readFlag("session", LEGAL_FROM_SETTINGS) !== null)
		writeFlag("session", LEGAL_FROM_SETTINGS, "0");
}

/** Call before a link to the about page or privacy policy: whether it is followed from Setelan. */
export function markLegalOrigin(fromSettings: boolean) {
	writeFlag("session", LEGAL_FROM_SETTINGS, fromSettings ? "1" : "0");
}

/** Whether the about page or privacy policy was reached from Setelan; false until hydration. */
export function useOpenedFromSettings() {
	return useFlag("session", LEGAL_FROM_SETTINGS, "0") === "1";
}
