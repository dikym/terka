import { describe, expect, spyOn, test } from "bun:test";
import { sortEvents } from "../../../src/core/log/order";
import { seeded, shuffle } from "../../../src/core/random";
import { append } from "../../../src/core/replay/replay";
import { snapshot, stateOf } from "./fixtures";
import { randomLog } from "./generator";

const SEEDS = ["alpha", "bravo", "charlie", "delta", "echo"];

describe("replay determinism", () => {
	test("any arrival order gives the same state", () => {
		for (const seed of SEEDS) {
			const events = randomLog(seed, 300, { voids: true });
			const expected = snapshot(stateOf(events));
			expect(snapshot(stateOf(shuffle(events, seeded(`${seed}-order`))))).toEqual(expected);
		}
	});
	test("an event received twice counts once", () => {
		for (const seed of SEEDS) {
			const events = randomLog(seed, 300, { voids: true });
			expect(snapshot(stateOf([...events, ...events.slice(0, 50)]))).toEqual(
				snapshot(stateOf(events))
			);
		}
	});
	test("appending a later batch equals replaying everything", () => {
		for (const seed of SEEDS) {
			const sorted = sortEvents(randomLog(seed, 300));
			const cut = Math.floor(sorted.length * 0.6);
			const result = append(
				stateOf(sorted.slice(0, cut)),
				shuffle(sorted.slice(cut), seeded(seed))
			);
			if (result === "full" || result.status !== "ok")
				throw new Error(`append failed for ${seed}`);
			expect(snapshot(result.state)).toEqual(snapshot(stateOf(sorted)));
		}
	});
	test("a late event in the middle asks for one full replay that equals the final log", () => {
		for (const seed of SEEDS) {
			const sorted = sortEvents(randomLog(seed, 300));
			const late = sorted[100];
			const prefix = sorted.slice(0, 200).filter((event) => event !== late);
			expect(append(stateOf(prefix), [...sorted.slice(200), late])).toBe("full");
			expect(snapshot(stateOf([...prefix, ...sorted.slice(200), late]))).toEqual(
				snapshot(stateOf(sorted))
			);
		}
	});
	test("replay does not read the system clock", () => {
		const events = randomLog("clock", 200);
		const first = snapshot(stateOf(events));
		const spy = spyOn(Date, "now").mockReturnValue(0);
		const second = snapshot(stateOf(events));
		spy.mockRestore();
		expect(second).toEqual(first);
	});
});
