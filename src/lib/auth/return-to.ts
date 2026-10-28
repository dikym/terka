import { LOGIN_RETURN_TO, readFlag, writeFlag } from "@/lib/flags";

const BASE = "http://terka.invalid";

/** The sign-in screens themselves are excluded so a return trip cannot loop. */
const AUTH_PATH = /^\/(masuk|auth)(\/|$)/;

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

export function loginHref(returnTo?: string): string {
	return returnTo ? `/masuk?kembali=${encodeURIComponent(returnTo)}` : "/masuk";
}

/** Google's round trip leaves the app, so the destination waits in this tab's storage. */
export function rememberReturnTo(path: string) {
	writeFlag("session", LOGIN_RETURN_TO, path);
}

/** The remembered destination, read once; null when none was kept (another tab, cleared storage). */
export function takeReturnTo(): string | null {
	const path = safeReturnPath(readFlag("session", LOGIN_RETURN_TO));
	writeFlag("session", LOGIN_RETURN_TO, "");
	return path;
}
