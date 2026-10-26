import { useSyncExternalStore } from "react";

// Small per-browser flags that survive navigation. Storage can be blocked
// (private mode, cleared site data), so every access falls back quietly.
type Store = "local" | "session";

const storage = (store: Store) => (store === "local" ? localStorage : sessionStorage);

/** `fallback` stands in only when storage cannot be read at all. */
export function readFlag(store: Store, key: string, fallback: string | null = null) {
	try {
		return storage(store).getItem(key);
	} catch {
		return fallback;
	}
}

const noSubscribe = () => () => {};

/** Reads a flag after hydration; the server render sees `serverValue`. */
export function useFlag(
	store: Store,
	key: string,
	serverValue: string | null,
	fallback = serverValue
) {
	return useSyncExternalStore(
		noSubscribe,
		() => readFlag(store, key, fallback),
		() => serverValue
	);
}

export function writeFlag(store: Store, key: string, value: string) {
	try {
		storage(store).setItem(key, value);
	} catch {
		// Nothing to do: the default state shows next time.
	}
}

export { WELCOME_SEEN } from "./flag-keys";
export const LOGIN_PROMPT_DISMISSED = "terka.loginPromptDismissed";
export const SEEN_CONTENT_REV = "terka.seenContentRev";
