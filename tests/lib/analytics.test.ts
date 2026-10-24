import { describe, expect, test } from "bun:test";
import { beforeSend, pageViewUrl } from "../../src/lib/analytics";

describe("page view url", () => {
	test("drops the auth code and fragment from the callback", () => {
		expect(pageViewUrl("https://terka.my.id/auth/callback?code=abc#x")).toBe(
			"https://terka.my.id/auth/callback"
		);
	});

	test("drops any query string", () => {
		expect(pageViewUrl("https://terka.my.id/sesi?scope=jawa")).toBe("https://terka.my.id/sesi");
	});

	test("keeps the root path", () => {
		expect(pageViewUrl("https://terka.my.id/")).toBe("https://terka.my.id/");
	});

	test("sends only the reduced url", () => {
		expect(beforeSend({ type: "pageview", url: "https://terka.my.id/statistik?x=1" })).toEqual({
			type: "pageview",
			url: "https://terka.my.id/statistik"
		});
	});
});
