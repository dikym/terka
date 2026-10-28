import { LOGIN_RETURN_TO, readFlag, writeFlag } from "@/lib/flags";

const BASE = "http://terka.invalid";

/** The sign-in screens themselves are excluded so a return trip cannot loop. */
const AUTH_PATH = /^\/(masuk|auth)(\/|$)/;

/** A destination left unused this long belongs to a visit that was abandoned. */
const REMEMBER_MS = 30 * 60_000;

/** An in-app path worth returning to, or null for anything else, including other sites. */
export function safeReturnPath(raw: string | null | undefined): string | null {
	if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
	let url: URL;
	try {
		url = new URL(raw, BASE);
	} catch {
		return null;
	}
	if (url.origin !== BASE || AUTH_PATH.test(url.pathname)) return null;
	return url.pathname + url.search + url.hash;
}

// Set while the sign-in page is the entry right after the page it will return to. Lives in
// memory on purpose: a reload or the Google round trip breaks that adjacency.
let openedFrom: string | null = null;

/** Google's round trip leaves the app, so the destination waits in this tab's storage. */
export function rememberReturnTo(path: string, now = Date.now()) {
	openedFrom = null;
	writeFlag("session", LOGIN_RETURN_TO, JSON.stringify({ path, at: now }));
}

function remembered(now: number): string | null {
	try {
		const { path, at } = JSON.parse(readFlag("session", LOGIN_RETURN_TO) ?? "");
		return typeof at === "number" && now - at < REMEMBER_MS ? safeReturnPath(path) : null;
	} catch {
		return null;
	}
}

/** The remembered destination, kept for the sign-in page to read; null when none is kept. */
export const peekReturnTo = (now = Date.now()) => remembered(now);

/** The remembered destination, read once; null when none was kept (another tab, cleared storage). */
export function takeReturnTo(now = Date.now()): string | null {
	const path = remembered(now);
	writeFlag("session", LOGIN_RETURN_TO, "");
	return path;
}

const currentPath = () => location.pathname + location.search + location.hash;

/** Opens the sign-in page and remembers where to go once signed in; defaults to this page. */
export function openLogin(router: { push: (href: string) => void }, returnTo = currentPath()) {
	const path = safeReturnPath(returnTo);
	if (path) rememberReturnTo(path);
	openedFrom = path !== null && path === currentPath() ? path : null;
	router.push("/masuk");
}

/**
 * Leaves the sign-in page for `destination`. When that is the page that opened it, one step
 * back keeps history free of a duplicate entry; otherwise the sign-in entry is replaced.
 */
export function leaveLogin(
	router: { back: () => void; replace: (href: string) => void },
	destination: string
) {
	const back = openedFrom === destination;
	openedFrom = null;
	writeFlag("session", LOGIN_RETURN_TO, "");
	if (back) router.back();
	else router.replace(destination);
}
