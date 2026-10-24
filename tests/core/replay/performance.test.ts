import { expect, test } from "bun:test";
import { append, replay } from "../../../src/core/replay/replay";
import { review, ruleBundle } from "./fixtures";
import { randomLog } from "./generator";

const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("a full replay of 20,000 events stays under half a second", () => {
	const events = randomLog("performance", 20_000, { voids: true });
	const started = performance.now();
	const result = replay(events, ruleBundle());
	const elapsed = performance.now() - started;
	expect(result.status).toBe("ok");
	expect(elapsed).toBeLessThan(500);
});

test("appending one answer to a 20,000-event state stays under one frame", () => {
	const events = randomLog("performance", 20_000);
	const result = replay(events, ruleBundle());
	if (result.status !== "ok") throw new Error("expected a usable state");
	const last = result.state.lastKey!.ts;
	const timings = Array.from({ length: 20 }, (_, index) => {
		const answer = review("dk", "code2region", last + (index + 1) * 60_000);
		const started = performance.now();
		const next = append(result.state, [answer]);
		const elapsed = performance.now() - started;
		expect(next).not.toBe("full");
		return elapsed;
	});
	expect(median(timings)).toBeLessThan(16);
});
