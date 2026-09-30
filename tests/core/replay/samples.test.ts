import { describe, expect, test } from "bun:test";
import type { ReviewLog } from "../../../src/core/log/events";
import {
	answerForm,
	fluencyGroup,
	recordSample,
	toSignals
} from "../../../src/core/replay/samples";
import { fresh, NOW, review } from "./fixtures";

const row = (overrides: Partial<ReviewLog> = {}) =>
	review("dk", "code2region", NOW, overrides).row as ReviewLog;

describe("answer samples", () => {
	test("answer form follows the question shape and the mode", () => {
		expect(answerForm({ mode: "code2region", questionType: "choice" })).toBe("choice");
		expect(answerForm({ mode: "code2region", questionType: "typed" })).toBe("name");
		expect(answerForm({ mode: "region2code", questionType: "typed" })).toBe("code");
		expect(answerForm({ mode: "holder2special", questionType: "typed" })).toBe("code");
	});
	test("each bucket keeps only the last 200 samples", () => {
		const state = fresh();
		for (let index = 0; index < 205; index++) {
			const answer = row({ msToFirstKey: index + 1 });
			recordSample(state, answer, toSignals(answer, false));
		}
		const group = fluencyGroup(state, toSignals(row(), false));
		expect(group).toHaveLength(200);
		expect(group[0].msToFirstKey).toBe(6);
		expect(state.durations.get("typed|2|keyboard")).toHaveLength(200);
	});
	test("intro answers add a duration but no percentile sample", () => {
		const state = fresh();
		const answer = row({ context: "intro", level: 1, questionType: "choice" });
		recordSample(state, answer, toSignals(answer, false));
		expect(state.narrow.size).toBe(0);
		expect(state.durations.get("choice|1|keyboard")).toEqual([3000]);
	});
	test("interrupted answers add no duration", () => {
		const state = fresh();
		const answer = row({ interrupted: true });
		recordSample(state, answer, toSignals(answer, false));
		expect(state.durations.size).toBe(0);
	});
});
