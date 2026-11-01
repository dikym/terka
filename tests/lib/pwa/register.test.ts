import { describe, expect, test } from "bun:test";
import { holdsUpdate, updateAction } from "../../../src/lib/pwa/register";

describe("what to do with a waiting version", () => {
	test("nothing while no new version waits", () => {
		expect(updateAction({ waiting: false, held: false, typing: false })).toBe("none");
		expect(updateAction({ waiting: false, held: true, typing: true })).toBe("none");
	});
	test("it is installed on its own while nothing is in progress", () => {
		expect(updateAction({ waiting: true, held: false, typing: false })).toBe("apply");
	});
	test("it waits during a session or while typing", () => {
		expect(updateAction({ waiting: true, held: true, typing: false })).toBe("wait");
		expect(updateAction({ waiting: true, held: false, typing: true })).toBe("wait");
	});
});

describe("screens that hold a waiting version", () => {
	test("a session and the sign-in page hold it", () => {
		expect(holdsUpdate("/sesi")).toBe(true);
		expect(holdsUpdate("/sesi/abc")).toBe(true);
		expect(holdsUpdate("/masuk")).toBe(true);
	});
	test("other screens do not", () => {
		expect(holdsUpdate("/beranda")).toBe(false);
		expect(holdsUpdate("/")).toBe(false);
	});
});
