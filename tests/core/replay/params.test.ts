import { describe, expect, test } from "bun:test";
import type { FsrsParams } from "../../../src/core/log/events";
import { addParams, schedulerAt } from "../../../src/core/replay/params";
import { createScheduler } from "../../../src/core/scheduling/fsrs";
import { DAY, HOUR, MINUTE, NOW, intro, params, review, stateOf } from "./fixtures";

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
	test("equal activation and device fall back to the larger id in any arrival order", () => {
		const a = row(NOW, tweaked(1), { id: "id-a" });
		const b = row(NOW, tweaked(2), { id: "id-b" });
		expect(schedulerAt(addParams(addParams([], a), b), NOW).parameters.w[0]).toBe(2);
		expect(schedulerAt(addParams(addParams([], b), a), NOW).parameters.w[0]).toBe(2);
	});
	test("new parameters keep a formed due date and shape the next answer", () => {
		const choice = { level: 1, questionType: "choice" } as const;
		const learned = [
			intro("dk", NOW),
			review("dk", "code2region", NOW + MINUTE, choice),
			review("dk", "code2region", NOW + 11 * MINUTE, choice)
		];
		const fast = defaults.map((weight, index) => (index === 8 ? weight * 1.5 : weight));
		const activated = params(NOW + DAY, fast);
		const before = stateOf(learned).cards.get("dk::code2region")!;
		const after = stateOf([...learned, activated]).cards.get("dk::code2region")!;
		expect(after.due).toBe(before.due);

		const next = review("dk", "code2region", NOW + 30 * DAY, choice);
		const withDefault = stateOf([...learned, next]).cards.get("dk::code2region")!;
		const withNew = stateOf([...learned, activated, next]).cards.get("dk::code2region")!;
		expect(withNew.stability).not.toBe(withDefault.stability);
	});
});
