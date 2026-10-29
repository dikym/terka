import { useSyncExternalStore } from "react";

type Navigator = typeof window.navigator & { userAgentData?: { platform?: string } };

/** Whether this is an Apple device, where the command key does what control does elsewhere. */
export function isApplePlatform(): boolean {
	if (typeof navigator === "undefined") return false;
	const { userAgentData, platform, userAgent } = navigator as Navigator;
	return /Mac|iPhone|iPad|iPod/i.test(userAgentData?.platform || platform || userAgent);
}

const noSubscribe = () => () => {};

/** The key combination that finishes a typed list, written for this device. */
export function useFinishKey(): string {
	return useSyncExternalStore(
		noSubscribe,
		() => (isApplePlatform() ? "⌘ Enter" : "Ctrl Enter"),
		() => "Ctrl Enter"
	);
}

/** Enter with command on an Apple device, with control elsewhere; no other modifier. */
export function isFinishKey(
	event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
	apple = isApplePlatform()
): boolean {
	if (event.key !== "Enter" || event.altKey || event.shiftKey) return false;
	return apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
