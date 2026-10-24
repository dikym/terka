import { describe, expect, test } from "bun:test";
import { applyEvent } from "../../../src/core/replay/apply";
import { localDay } from "../../../src/core/time/day";
import {
	exportReminderDue,
	loginPromptDue,
	noteOffer,
	pendingNotices
} from "../../../src/core/views/notices";
import { fresh, NOW, review, reviewCard, seedCard } from "../replay/fixtures";

describe("note offer", () => {
	test("offered at four lapses once, then again at six", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 4 }));
		expect(noteOffer(state, "dk", false, [])).toBe(4);
		expect(noteOffer(state, "dk", false, [4])).toBeNull();
		seedCard(state, "dk::region2code", reviewCard({ lapses: 6 }));
		expect(noteOffer(state, "dk", false, [4])).toBe(6);
		expect(noteOffer(state, "dk", false, [4, 6])).toBeNull();
	});
	test("no offer below four lapses or when a note exists", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 3 }));
		expect(noteOffer(state, "dk", false, [])).toBeNull();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 5 }));
		expect(noteOffer(state, "dk", true, [])).toBeNull();
	});
});

describe("notices", () => {
	test("a card suspended by its eighth lapse, even after a sync, is announced once", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 7 }));
		applyEvent(
			state,
			review("dk", "code2region", NOW + 3_600_000, { deviceId: "laptop", correct: false })
		);
		expect(pendingNotices(state, new Set(), 1)).toMatchObject([
			{ cardId: "dk::code2region", reason: "leech" }
		]);
		expect(
			pendingNotices(
				state,
				new Set(pendingNotices(state, new Set(), 1).map((notice) => notice.key)),
				1
			)
		).toEqual([]);
	});
	test("a learned card whose data dropped is announced; never-learned cards and manual suspends are not", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		seedCard(state, "bb::code2region", {
			...reviewCard(),
			state: "suspended",
			suspension: { reason: "manual", resume: "review" }
		});
		state.content.set("bk", "confidence");
		state.content.set("ba", "missing-data");
		expect(pendingNotices(state, new Set(), 1)).toMatchObject([
			{ cardId: "bk::code2region", reason: "confidence" }
		]);
	});
});

describe("login prompt", () => {
	test("after seven active days without an account, until dismissed", () => {
		const state = fresh();
		for (let day = 10; day < 16; day++) state.activeDays.add(`2026-09-${day}`);
		expect(loginPromptDue(state, false, false)).toBe(false);
		state.activeDays.add("2026-09-16");
		expect(loginPromptDue(state, false, false)).toBe(true);
		expect(loginPromptDue(state, true, false)).toBe(false);
		expect(loginPromptDue(state, false, true)).toBe(false);
	});
});

describe("export reminder", () => {
	const DAY = 86_400_000;
	const tz = "Asia/Makassar";
	const active = (days: number) => {
		const state = fresh();
		state.activeDays.add(localDay(NOW - days * DAY, tz));
		return state;
	};

	test("stays quiet while nothing has been practised", () => {
		expect(exportReminderDue(fresh(), null, NOW, tz)).toBe(false);
	});

	test("counts from the first active day when nothing was exported yet", () => {
		expect(exportReminderDue(active(29), null, NOW, tz)).toBe(false);
		expect(exportReminderDue(active(31), null, NOW, tz)).toBe(true);
	});

	test("counts from the last export", () => {
		expect(exportReminderDue(active(90), NOW - 29 * DAY, NOW, tz)).toBe(false);
		expect(exportReminderDue(active(90), NOW - 30 * DAY, NOW, tz)).toBe(true);
	});
});
