import { describe, expect, test } from "bun:test";
import type { PracticeRun, ReviewLog } from "../../../src/core/log/events";
import { buildQuestion } from "../../../src/core/questions/build";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { newEntry } from "../../../src/core/replay/state";
import { checkAnswer } from "../../../src/core/session/check";
import {
	answerEvent,
	canUndo,
	cardEvent,
	closeRun,
	sightingEvent,
	startRun,
	voidEvent,
	type Measurements
} from "../../../src/core/session/commands";
import { ENGINE_VERSION } from "../../../src/rules";
import { MINUTE, NOW, ruleBundle, stateOf } from "../replay/fixtures";
import { ctxAt, dictionary, SUMATERA } from "./fixtures";

const bundle = ruleBundle();
const measured = (overrides: Partial<Measurements> = {}): Measurements => ({
	msToFirstKey: 1500,
	msTotal: 3000,
	msTyping: 800,
	keyGapsMs: [120, 140],
	deletedChars: 0,
	optionChanges: 0,
	optionCount: null,
	inputMode: "keyboard",
	interrupted: false,
	timedOut: false,
	...overrides
});
const introQuestion = buildQuestion(newEntry("dk::code2region"), bundle, { context: "intro" });

function answered(text: string, overrides: Partial<Measurements> = {}, ctx = ctxAt(NOW)) {
	const question = buildQuestion(
		{ ...newEntry("bk::code2region"), state: "review", intervalDays: 5 },
		bundle,
		{ context: "daily" }
	);
	const response = { text };
	return answerEvent(
		question,
		response,
		checkAnswer(question, response, bundle, dictionary),
		measured(overrides),
		ctx,
		{ runId: "run-1", contentVersion: 3 }
	);
}

describe("answer events", () => {
	test("an answer row carries the question, the check and the versions", () => {
		const event = answered("Medan");
		expect(event.table).toBe("review_logs");
		expect(event.row).toMatchObject({
			contentId: "bk",
			mode: "code2region",
			context: "daily",
			correct: true,
			matchType: "exact",
			runId: "run-1",
			contentVersion: 3,
			engineVersion: ENGINE_VERSION,
			answerRulesVersion: 1,
			localDay: "2026-09-21",
			tz: "Asia/Makassar",
			receivedAt: null
		});
	});
	test("key gaps keep at most 120 values, each capped at 30 seconds", () => {
		const row = answered("Medan", { keyGapsMs: [45_000, ...Array<number>(130).fill(100)] })
			.row as ReviewLog;
		expect(row.keyGapsMs).toHaveLength(120);
		expect(row.keyGapsMs?.[0]).toBe(30_000);
	});
	test("don't know is marked only in placement", () => {
		const question = buildQuestion(newEntry("bk::code2region"), bundle, {
			context: "placement"
		});
		const response = { unknown: true } as const;
		const row = answerEvent(
			question,
			response,
			checkAnswer(question, response, bundle, dictionary),
			measured({ msToFirstKey: null }),
			ctxAt(NOW),
			{ runId: "p", contentVersion: 3 }
		).row as ReviewLog;
		expect(row).toMatchObject({ unknown: true, correct: false, context: "placement" });
	});
	test("an introduction written by the command replays as an introduction", () => {
		const response = introQuestion.choices.length
			? { choice: introQuestion.choices[0] }
			: { unknown: true as const };
		const event = answerEvent(
			introQuestion,
			response,
			checkAnswer(introQuestion, response, bundle, dictionary),
			measured(),
			ctxAt(NOW),
			{ runId: null, contentVersion: 3 }
		);
		expect(stateOf([event]).cards.get("dk::code2region")?.state).toBe("learning");
	});
	test("the local day does not move back after a time zone change", () => {
		const question = buildQuestion(
			{ ...newEntry("bk::code2region"), state: "review", intervalDays: 5 },
			bundle,
			{ context: "daily" }
		);
		const response = { text: "Medan" };
		const row = answerEvent(
			question,
			response,
			checkAnswer(question, response, bundle, dictionary),
			measured(),
			{ ...ctxAt(NOW), tz: "Asia/Jakarta" },
			{
				runId: null,
				contentVersion: 3,
				lastDay: { localDay: "2026-09-21", tz: "Asia/Makassar" }
			}
		).row as ReviewLog;
		expect(row.localDay).toBe("2026-09-21");
	});
});

describe("sessions", () => {
	test("a national session starts open with no scope id", () => {
		const row = startRun("daily", NATIONAL, ctxAt(NOW), {
			estimatedMs: 120_000,
			plannedCount: 14
		}).row as PracticeRun;
		expect(row).toMatchObject({
			kind: "daily",
			scopeLevel: "national",
			scopeId: null,
			endedAt: null,
			estimatedMs: 120_000
		});
	});
	test("closing fills the closing columns once", () => {
		const run = startRun("kilat", SUMATERA, ctxAt(NOW), {
			estimatedMs: null,
			plannedCount: null
		}).row as PracticeRun;
		const closed = closeRun(run, ctxAt(NOW + MINUTE), {
			answered: 20,
			correct: 17,
			activeMs: 60_000,
			score: 17
		}).row as PracticeRun;
		expect(closed).toMatchObject({
			id: run.id,
			endedAt: NOW + MINUTE,
			score: 17,
			scopeId: "sumatera"
		});
		expect(
			stateOf([{ table: "practice_runs", row: closed }]).kilatRecords.get("group|sumatera")
		).toBe(17);
	});
	test("score belongs only to Kilat and placement level only to placement", () => {
		const kilat = startRun("kilat", NATIONAL, ctxAt(NOW), {
			estimatedMs: null,
			plannedCount: null
		}).row as PracticeRun;
		const placement = startRun("placement", NATIONAL, ctxAt(NOW), {
			estimatedMs: null,
			plannedCount: null
		}).row as PracticeRun;
		const daily = startRun("daily", NATIONAL, ctxAt(NOW), {
			estimatedMs: null,
			plannedCount: null
		}).row as PracticeRun;
		const result = { answered: 5, correct: 4, activeMs: 1000 };
		expect(() => closeRun(kilat, ctxAt(NOW), result)).toThrow();
		expect(() => closeRun(placement, ctxAt(NOW), result)).toThrow();
		expect(() => closeRun(daily, ctxAt(NOW), { ...result, score: 4 })).toThrow();
		expect(() => closeRun(daily, ctxAt(NOW), { ...result, correct: 6 })).toThrow();
		expect(
			(
				closeRun(placement, ctxAt(NOW), { ...result, placementLevel: "mahir" })
					.row as PracticeRun
			).placementLevel
		).toBe("mahir");
	});
});

describe("undo", () => {
	const last = answered("Medan").row as ReviewLog;
	test("only the last answer on this device, while the screen is open, once", () => {
		expect(canUndo(last, { deviceId: "device-a" }, { voided: false, open: true })).toBe(true);
		expect(canUndo(last, { deviceId: "device-a" }, { voided: true, open: true })).toBe(false);
		expect(canUndo(last, { deviceId: "device-a" }, { voided: false, open: false })).toBe(false);
		expect(canUndo(last, { deviceId: "device-b" }, { voided: false, open: true })).toBe(false);
		expect(canUndo(null, { deviceId: "device-a" }, { voided: false, open: true })).toBe(false);
	});
	test("Kilat answers cannot be undone", () => {
		expect(
			canUndo(
				{ ...last, context: "kilat" },
				{ deviceId: "device-a" },
				{ voided: false, open: true }
			)
		).toBe(false);
	});
	test("a void points at the answer and refuses another device's answer", () => {
		expect(voidEvent(last, ctxAt(NOW + MINUTE)).row).toMatchObject({
			reviewId: last.id,
			deviceId: "device-a"
		});
		expect(() => voidEvent(last, ctxAt(NOW, "device-b"))).toThrow();
	});
});

describe("Pelat Terlihat", () => {
	const at = ctxAt(NOW);
	test("a code or a full plate keeps only the front code", () => {
		expect(sightingEvent("DK", bundle, at, null)?.row).toMatchObject({ regionId: "dk" });
		const plate = sightingEvent("dk 1234 abc", bundle, at, null);
		expect(plate?.row).toMatchObject({ regionId: "dk" });
		expect(JSON.stringify({ ...plate?.row, id: "" })).not.toContain("1234");
	});
	test("place names, special series and unknown codes are not recorded", () => {
		for (const input of ["Denpasar", "CD 49 07", "RI 1", "CC", "ZZ 12"])
			expect(sightingEvent(input, bundle, at, null)).toBeNull();
	});
	test("the same code within 10 minutes on this device is not recorded again; at 10 minutes it is", () => {
		expect(sightingEvent("DK", bundle, at, NOW - 10 * MINUTE + 1)).toBeNull();
		expect(sightingEvent("DK", bundle, at, NOW - 10 * MINUTE)).not.toBeNull();
	});
});

describe("card events", () => {
	test("a manual suspend names the card", () => {
		expect(cardEvent("dk::region2code", "suspend", ctxAt(NOW)).row).toMatchObject({
			contentId: "dk",
			mode: "region2code",
			kind: "suspend"
		});
	});
});
