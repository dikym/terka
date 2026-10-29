import { describe, expect, test } from "bun:test";
import { updateAction } from "../../../src/lib/pwa/register";

describe("what to do with a waiting version", () => {
	test("nothing while no new version waits", () => {
		expect(updateAction({ waiting: false, inSession: false, typing: false })).toBe("none");
		expect(updateAction({ waiting: false, inSession: true, typing: true })).toBe("none");
	});
	test("it is installed on its own while nothing is in progress", () => {
		expect(updateAction({ waiting: true, inSession: false, typing: false })).toBe("apply");
	});
	test("it waits during a session or while typing", () => {
		expect(updateAction({ waiting: true, inSession: true, typing: false })).toBe("wait");
		expect(updateAction({ waiting: true, inSession: false, typing: true })).toBe("wait");
	});
});
