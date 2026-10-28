import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	leaveLogin,
	openLogin,
	peekReturnTo,
	rememberReturnTo,
	safeReturnPath,
	takeReturnTo
} from "../../../src/lib/auth/return-to";

const NOW = Date.parse("2026-10-28T08:00:00Z");

describe("return path after sign-in", () => {
	test("keeps an in-app path with its query and hash", () => {
		expect(safeReturnPath("/beranda")).toBe("/beranda");
		expect(safeReturnPath("/statistik/sulit?kode=B#atas")).toBe("/statistik/sulit?kode=B#atas");
	});

	test("rejects other sites and ways to write one", () => {
		for (const raw of [
			"https://evil.example/beranda",
			"//evil.example",
			"/\\evil.example",
			"javascript:alert(1)",
			"beranda"
		])
			expect([raw, safeReturnPath(raw)]).toEqual([raw, null]);
	});

	test("rejects the sign-in screens so a return trip cannot loop", () => {
		for (const raw of ["/masuk", "/masuk?x=/beranda", "/auth/callback?code=abc"])
			expect([raw, safeReturnPath(raw)]).toEqual([raw, null]);
	});

	test("treats a missing value as no destination", () => {
		expect(safeReturnPath(null)).toBeNull();
		expect(safeReturnPath(undefined)).toBeNull();
		expect(safeReturnPath("")).toBeNull();
	});

	test("finds no destination when storage cannot be read", () => {
		expect(takeReturnTo()).toBeNull();
		expect(peekReturnTo()).toBeNull();
	});
});

describe("sign-in destination kept in the tab", () => {
	const store = new Map<string, string>();
	const globals = globalThis as Record<string, unknown>;

	beforeEach(() => {
		store.clear();
		globals.sessionStorage = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => void store.set(key, value)
		};
		globals.location = { pathname: "/statistik", search: "", hash: "" };
	});
	afterEach(() => {
		delete globals.sessionStorage;
		delete globals.location;
	});

	const router = () => {
		const calls: string[] = [];
		return {
			calls,
			push: (href: string) => calls.push(`push ${href}`),
			replace: (href: string) => calls.push(`replace ${href}`),
			back: () => calls.push("back")
		};
	};

	test("is readable until it is taken, then gone", () => {
		rememberReturnTo("/statistik/sulit?kode=B", NOW);
		expect(peekReturnTo(NOW)).toBe("/statistik/sulit?kode=B");
		expect(takeReturnTo(NOW)).toBe("/statistik/sulit?kode=B");
		expect(takeReturnTo(NOW)).toBeNull();
	});

	test("is dropped once the visit looks abandoned", () => {
		rememberReturnTo("/statistik", NOW);
		expect(peekReturnTo(NOW + 29 * 60_000)).toBe("/statistik");
		expect(peekReturnTo(NOW + 31 * 60_000)).toBeNull();
	});

	test("ignores a stored value that is not a safe path", () => {
		store.set("terka.loginReturnTo", JSON.stringify({ path: "//evil.example", at: NOW }));
		expect(peekReturnTo(NOW)).toBeNull();
		store.set("terka.loginReturnTo", "/beranda");
		expect(peekReturnTo(NOW)).toBeNull();
	});

	test("opening sign-in from a page remembers that page and goes to the bare sign-in URL", () => {
		const nav = router();
		openLogin(nav);
		expect(nav.calls).toEqual(["push /masuk"]);
		expect(peekReturnTo()).toBe("/statistik");
	});

	test("leaving sign-in for the page that opened it steps back once", () => {
		const nav = router();
		openLogin(nav);
		leaveLogin(nav, "/statistik");
		expect(nav.calls).toEqual(["push /masuk", "back"]);
		expect(peekReturnTo()).toBeNull();
	});

	test("leaving sign-in for another page replaces the sign-in entry", () => {
		const nav = router();
		openLogin(nav, "/beranda");
		leaveLogin(nav, "/beranda");
		expect(nav.calls).toEqual(["push /masuk", "replace /beranda"]);
	});

	test("the Google round trip never steps back", () => {
		const nav = router();
		openLogin(nav);
		rememberReturnTo("/statistik");
		leaveLogin(nav, "/statistik");
		expect(nav.calls).toEqual(["push /masuk", "replace /statistik"]);
	});

	test("a visit that did not come through the opener never steps back", () => {
		const nav = router();
		leaveLogin(nav, "/statistik");
		expect(nav.calls).toEqual(["replace /statistik"]);
	});

	test("steps back only once per opening", () => {
		const nav = router();
		openLogin(nav);
		leaveLogin(nav, "/statistik");
		leaveLogin(nav, "/statistik");
		expect(nav.calls).toEqual(["push /masuk", "back", "replace /statistik"]);
	});

	test("a destination that is not a safe path is not remembered", () => {
		const nav = router();
		openLogin(nav, "https://evil.example");
		expect(peekReturnTo()).toBeNull();
		expect(nav.calls).toEqual(["push /masuk"]);
	});
});
