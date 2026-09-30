import { describe, expect, test } from "bun:test";
import type { FsrsParams } from "../../../src/core/log/events";
import { addParams, schedulerAt } from "../../../src/core/replay/params";
import { createScheduler } from "../../../src/core/scheduling/fsrs";
import { HOUR, NOW, params } from "./fixtures";

const defaults = [...createScheduler().parameters.w];
const tweaked = (first: number) => [first, ...defaults.slice(1)];
const row = (...args: Parameters<typeof params>) => params(...args).row as FsrsParams;

describe("parameter timeline", () => {
	test("default FSRS-6 weights apply before any active row", () => {
		expect([...schedulerAt([], NOW).parameters.w]).toEqual(defaults);
	});
	test("the latest active row at or before the answer applies", () => {
		let list = addParams([], row(NOW, tweaked(1)));
		list = addParams(list, row(NOW + HOUR, tweaked(2)));
		expect(schedulerAt(list, NOW + 30 * 60_000).parameters.w[0]).toBe(1);
		expect(schedulerAt(list, NOW + HOUR).parameters.w[0]).toBe(2);
	});
	test("rejected rows never apply", () => {
		expect(addParams([], row(NOW, tweaked(1), { status: "rejected" }))).toEqual([]);
	});
	test("equal activation picks the larger device id", () => {
		let list = addParams([], row(NOW, tweaked(1), { deviceId: "device-b" }));
		list = addParams(list, row(NOW, tweaked(2), { deviceId: "device-a" }));
		expect(schedulerAt(list, NOW).parameters.w[0]).toBe(1);
	});
	test("activation is capped at the time the server received the row", () => {
		const list = addParams([], row(NOW + HOUR, tweaked(3), { receivedAt: NOW }));
		expect(schedulerAt(list, NOW).parameters.w[0]).toBe(3);
	});
});
