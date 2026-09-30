import { expect, test } from "bun:test";
import { replay } from "../../../src/core/replay/replay";
import { ruleBundle } from "./fixtures";
import { randomLog } from "./generator";

test("a full replay of 20,000 events stays under half a second", () => {
	const events = randomLog("performance", 20_000, { voids: true });
	const started = performance.now();
	const result = replay(events, ruleBundle());
	const elapsed = performance.now() - started;
	expect(result.status).toBe("ok");
	expect(elapsed).toBeLessThan(500);
});
