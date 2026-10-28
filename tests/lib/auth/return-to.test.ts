import { describe, expect, test } from "bun:test";
import { loginHref, safeReturnPath, takeReturnTo } from "../../../src/lib/auth/return-to";

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
		for (const raw of ["/masuk", "/masuk?kembali=/beranda", "/auth/callback?code=abc"])
			expect([raw, safeReturnPath(raw)]).toEqual([raw, null]);
	});

	test("treats a missing value as no destination", () => {
		expect(safeReturnPath(null)).toBeNull();
		expect(safeReturnPath(undefined)).toBeNull();
		expect(safeReturnPath("")).toBeNull();
	});

	test("finds no destination when storage cannot be read", () => {
		expect(takeReturnTo()).toBeNull();
	});
});

describe("sign-in link", () => {
	test("goes to the bare sign-in page without a destination", () => {
		expect(loginHref()).toBe("/masuk");
	});

	test("encodes the destination", () => {
		expect(loginHref("/statistik/sulit?kode=B")).toBe(
			"/masuk?kembali=%2Fstatistik%2Fsulit%3Fkode%3DB"
		);
	});
});
