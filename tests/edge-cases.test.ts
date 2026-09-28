import { test } from "node:test";
import assert from "node:assert/strict";
import { createClock, advanceClock, boundary } from "../src/lib/terka/time";
import {
	createProgress,
	newCard,
	parseProgress,
	parseContent,
	reconcileContent
} from "../src/lib/terka/content";
import { matchAnswer, gradeAnswer, percentile } from "../src/lib/terka/grading";
import { scheduleAnswer } from "../src/lib/terka/scheduler";
import {
	applyAnswer,
	startSession,
	nextQuestion,
	refreshProgress,
	undoAnswer,
	finishSession,
	setCardSuspended
} from "../src/lib/terka/engine";
import { DAY, type Target, type Content, type Progress } from "../src/lib/terka/model";
import { NOW, fixture, raw, reviewing, answerCurrent } from "./fixtures";
import {
	answerStats,
	challengeStreak,
	forecast,
	weakCards,
	masteryMap,
	sessionSummary
} from "../src/lib/terka/statistics";

test("date-line travel never grants another learning day milliseconds after the protected boundary", () => {
	const before = createClock(NOW, "Etc/GMT+12");
	const travelled = advanceClock(before, NOW, "Pacific/Kiritimati");
	const first = advanceClock(travelled, travelled.nextBoundary);
	assert.equal(first.sequence, 1);
	assert.equal(advanceClock(first, first.lastSeen + 1).sequence, 1);
	assert.ok(first.nextBoundary - first.lastSeen >= 23 * 3_600_000);
	assert.equal(
		first.nextBoundary,
		boundary(new Date(Date.parse(first.day) + DAY).toISOString().slice(0, 10), first.timezone)
	);
});

for (const [day, hours] of [
	["2026-03-07", 23],
	["2026-10-31", 25]
] as const) {
	test(`04:00 learning boundaries handle New York DST: ${hours}-hour day`, () => {
		const start = boundary(day, "America/New_York");
		const clock = createClock(start, "America/New_York");
		assert.equal(clock.nextBoundary - start, hours * 3_600_000);
		assert.equal(advanceClock(clock, clock.nextBoundary - 1).sequence, 0);
		assert.equal(advanceClock(clock, clock.nextBoundary).sequence, 1);
	});
}

test("clock handles leap day, year rollover, missed days and backwards device time", () => {
	for (const [day, next] of [
		["2028-02-28", "2028-02-29"],
		["2026-12-31", "2027-01-01"]
	]) {
		const clock = createClock(boundary(day, "UTC"), "UTC");
		assert.equal(advanceClock(clock, clock.nextBoundary).day, next);
		assert.equal(advanceClock(clock, clock.nextBoundary + 5 * DAY).sequence, 6);
		assert.deepEqual(advanceClock(clock, clock.lastSeen - 1000), clock);
	}
	for (const now of [NaN, Infinity, -1]) assert.throws(() => advanceClock(createClock(NOW), now));
});

test("explicit city and county identities stay distinct even for a single suffix target", () => {
	const city: Target = { id: "d::city", name: "Kota Bandung", aliases: [] };
	const county: Target = {
		id: "d::county",
		name: "Kabupaten Bandung",
		aliases: ["Kab. Bandung"]
	};
	for (const [target, other] of [
		[city, county],
		[county, city]
	]) {
		assert.equal(matchAnswer(other.name, [target], [city, county], "name").correct, false);
		assert.equal(matchAnswer(target.name, [target], [city, county], "name").correct, true);
		assert.equal(matchAnswer("Bandung", [target], [city, county], "name").correct, true);
	}
	assert.equal(matchAnswer("Kab. Bandung", [city], [city, county], "name").correct, false);
	assert.equal(matchAnswer("Kota Bandun", [county], [city, county], "name").correct, false);
});

test("undo preserves timezone-induced deferral on other cards", () => {
	const content = fixture();
	let progress = reviewing(content);
	const other = progress.cards.find((card) => card.cardId === "dk::code2region")!;
	other.due = NOW + DAY;
	progress = startSession(progress, content, { id: "undo-travel", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	progress = answerCurrent(progress, content, "a");
	progress = refreshProgress(progress, content, NOW + 2000, "America/New_York");
	const deferred = progress.cards.find((card) => card.cardId === other.cardId)!;
	assert.ok(deferred.due > other.due);
	const undone = undoAnswer(progress);
	assert.equal(undone.cards.find((card) => card.cardId === other.cardId)!.due, deferred.due);
	assert.equal(undone.reviews.length, 0);
	assert.deepEqual(undone.clock, progress.clock);
});

test("finish rejects invalid or stale timestamps and advances observed time", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, { id: "finish", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q", now: NOW + 1000 });
	for (const now of [NaN, Infinity, -1, NOW]) assert.throws(() => finishSession(progress, now));
	const finished = finishSession(progress, NOW + 2000);
	assert.equal(finished.clock.lastSeen, NOW + 2000);
	assert.equal(finished.currentQuestion, null);
	progress.newCardsToday = ["be::code2region"];
	progress.newPaused = true;
	const nextDay = finishSession(progress, progress.clock.nextBoundary);
	assert.equal(nextDay.clock.sequence, 1);
	assert.deepEqual(nextDay.newCardsToday, []);
	assert.equal(nextDay.newPaused, false);
});

test("answer retry is idempotent but rejects the same ID with a changed payload", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, { id: "retry", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	const submission = {
		id: "a",
		sessionId: "retry",
		questionId: "q",
		now: NOW + 1000,
		msToFirstKey: 500,
		answers: [progress.currentQuestion!.targets[0].name]
	};
	progress = applyAnswer(progress, content, submission, () => 0.5);
	assert.deepEqual(applyAnswer(progress, content, submission), progress);
	for (const change of [
		{ answers: ["wrong"] },
		{ questionId: "other" },
		{ sessionId: "other" },
		{ now: NOW + 2000 },
		{ msToFirstKey: 600 }
	])
		assert.throws(() => applyAnswer(progress, content, { ...submission, ...change }));
});

test("grading changes at 30 samples, uses only the latest 200 and keeps percentile equality at Good", () => {
	const history = Array.from({ length: 201 }, (_, index) =>
		raw({ id: `h-${index}`, ts: NOW - 1000 + index, msToFirstKey: 1000 })
	);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 500 }), history.slice(0, 29)), 3);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 500 }), history.slice(0, 30)), 4);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 1500 }), history), 2);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 1000 }), history), 3);
	const old = Array.from({ length: 50 }, (_, index) =>
		raw({ id: `old-${index}`, ts: NOW - 2000, msToFirstKey: 10 })
	);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 500 }), [...old, ...history]), 4);
	assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
	assert.throws(() => percentile([], 0.5));
});

test("grading ignores future, timed-out, wrong, set, other-level and missing-timing samples", () => {
	for (const excluded of [
		{ ts: NOW + 1 },
		{ timedOut: true },
		{ correct: false },
		{ setTarget: 5, setCorrect: 5 },
		{ level: 3 as const },
		{ msToFirstKey: null },
		{ elapsedMs: 60_001 }
	]) {
		const history = Array.from({ length: 30 }, (_, index) =>
			raw({ id: `h-${index}`, msToFirstKey: 2000, ...excluded })
		);
		assert.equal(gradeAnswer(raw({ msToFirstKey: 100 }), history), 3, JSON.stringify(excluded));
	}
	const later = Array.from({ length: 30 }, (_, index) =>
		raw({ id: `later-${index}`, msToFirstKey: 2000 })
	);
	assert.equal(gradeAnswer(raw(), [raw(), ...later]), 3);
	assert.equal(gradeAnswer(raw({ elapsedMs: 60_000, msToFirstKey: 100 }), later), 4);
	assert.equal(gradeAnswer(raw({ elapsedMs: 60_001, msToFirstKey: 100 }), later), 3);
	assert.equal(gradeAnswer(raw({ msToFirstKey: null }), later), 3);
});

for (const [correct, target, fuzzy, timedOut, grade] of [
	[0, 5, false, false, 1],
	[4, 5, false, false, 2],
	[5, 5, false, false, 3],
	[6, 5, false, false, 3],
	[7, 5, false, false, 4],
	[7, 5, true, false, 2],
	[7, 5, false, true, 1]
] as const) {
	test(`set grading: ${correct}/${target}, fuzzy=${fuzzy}, timeout=${timedOut} gives ${grade}`, () => {
		assert.equal(
			gradeAnswer(
				raw({
					setCorrect: correct,
					setTarget: target,
					fuzzy,
					timedOut,
					correct: correct >= target
				}),
				[]
			),
			grade
		);
	});
}

test("name matching rejects fuzzy ties and changed first letters; normalization handles Unicode", () => {
	const targets = [
		{ id: "a", name: "Bali", aliases: [] },
		{ id: "b", name: "Balu", aliases: [] }
	];
	assert.equal(matchAnswer("Bale", targets, [], "name").ambiguous, true);
	assert.equal(matchAnswer("Cali", targets, [], "name").correct, false);
	assert.equal(matchAnswer(" ＢＡＬＩ ", targets, [], "name").matchedId, "a");
	assert.equal(matchAnswer("  ", targets, [], "name").correct, false);
});

test("failed minute steps restart learning and repeated relearning errors do not add daily lapses", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	let card = scheduleAnswer(newCard("be", "code2region", NOW), raw(), [], clock, () => 0.5);
	card = scheduleAnswer(card, raw({ ts: card.due }), [], clock);
	assert.equal(card.step, 2);
	const reset = scheduleAnswer(card, raw({ correct: false, ts: card.due }), [], clock);
	assert.equal(reset.step, 1);
	assert.equal(reset.due, card.due + 60_000);
	assert.equal(reset.stability, card.stability);
	const learned = reviewing().cards.find((card) => card.cardId === "be::code2region")!;
	const failed = scheduleAnswer(learned, raw({ correct: false }), [], clock, () => 0.5);
	assert.equal(failed.lapses, 1);
	assert.equal(failed.state, "relearning");
	const again = scheduleAnswer(failed, raw({ correct: false, ts: failed.due }), [], clock);
	assert.equal(again.lapses, 1);
	assert.equal(again.due, failed.due + 600_000);
	assert.equal(again.interval, failed.interval);
	const recovered = scheduleAnswer(again, raw({ ts: again.due }), [], clock);
	assert.equal(recovered.state, "review");
	assert.equal(recovered.pendingDue, null);
	assert.equal(recovered.due, failed.pendingDue);
	assert.deepEqual(scheduleAnswer(recovered, raw(), [], clock), recovered);
});

test("minute step across 04:00 gets one new daily memory update and fuzz stays within five percent", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const first = scheduleAnswer(
		newCard("be", "code2region", NOW),
		raw({ ts: clock.nextBoundary - 30_000 }),
		[],
		clock,
		() => 0.5
	);
	const nextClock = advanceClock(clock, first.due);
	const second = scheduleAnswer(first, raw({ ts: first.due }), [], nextClock, () => 0.5);
	assert.equal(second.scheduledDay, 1);
	assert.equal(second.lastReview, first.due);
	assert.equal(second.step, 2);
	const card = newCard("be", "code2region", NOW);
	const base = scheduleAnswer(card, raw(), [], clock, () => 0.5);
	assert.ok(
		Math.abs(scheduleAnswer(card, raw(), [], clock, () => 0).interval / base.interval - 0.95) <
			1e-10
	);
	assert.ok(
		scheduleAnswer(card, raw(), [], clock, () => 0.999999).interval / base.interval < 1.05
	);
	for (const sample of [-1, 1, NaN, Infinity])
		assert.throws(() => scheduleAnswer(card, raw(), [], clock, () => sample));
});

test("manual suspension and reactivation preserve history; unverified content cannot reactivate", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, { id: "suspend", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	progress = answerCurrent(progress, content, "a");
	const id = progress.reviews[0].cardId;
	progress = setCardSuspended(progress, content, id, true, NOW + 2000);
	assert.equal(progress.cards.find((card) => card.cardId === id)!.suspensionReason, "manual");
	assert.equal(progress.undo, null);
	const reset = setCardSuspended(progress, content, id, false, NOW + 3000);
	assert.equal(reset.cards.find((card) => card.cardId === id)!.state, "new");
	assert.deepEqual(reset.reviews, progress.reviews);
	const unverified = structuredClone(content);
	unverified.regions.forEach((region) => {
		region.confidence = "medium";
	});
	assert.throws(() => setCardSuspended(progress, unverified, id, false, NOW));
	assert.throws(() => setCardSuspended(progress, content, "missing", true, NOW));
});

const invalidContent: [string, (content: Content) => void][] = [
	[
		"duplicate region",
		(c) => {
			c.regions.push(structuredClone(c.regions[0]));
		}
	],
	[
		"duplicate code",
		(c) => {
			c.regions[1].code = c.regions[0].code;
		}
	],
	[
		"missing fact",
		(c) => {
			c.regions[0].facts = ["missing"];
		}
	],
	[
		"special training code",
		(c) => {
			c.regions[0].code = "RI";
		}
	],
	[
		"province in two groups",
		(c) => {
			c.regions[2].province = c.regions[0].province;
		}
	],
	[
		"unknown area membership",
		(c) => {
			c.regions[0].areas[0].areaId = "kab-ghost";
		}
	]
];
for (const [label, mutate] of invalidContent)
	test(`content rejects ${label}`, () => {
		const content = fixture();
		mutate(content);
		assert.throws(() => parseContent(content));
	});

test("content updates preserve suspended memory, tolerate renames and reject reused IDs", () => {
	const content = fixture();
	const before = reviewing();
	const renamed = structuredClone(content);
	renamed.regions[0].region = "Renamed area";
	assert.deepEqual(reconcileContent(before, renamed).cards, before.cards);
	const degraded = structuredClone(content);
	degraded.regions[0].confidence = "medium";
	const updated = reconcileContent(before, degraded);
	assert.equal(updated.cards[0].state, "suspended");
	assert.equal(updated.cards[0].stability, before.cards[0].stability);
	assert.equal(reconcileContent(updated, content).cards[0].state, "suspended");
	renamed.regions[0].code = "ZZ";
	assert.throws(() => reconcileContent(before, renamed), /Stable ID/);
});

test("malformed progress is rejected before it can be saved or restored", () => {
	const content = fixture();
	let valid = startSession(reviewing(), content, { id: "valid", mode: "daily", now: NOW });
	valid = nextQuestion(valid, content, { id: "q", now: NOW });
	valid = answerCurrent(valid, content, "a");
	assert.deepEqual(parseProgress(valid), valid);
	const changes: [string, (p: Progress) => void][] = [
		[
			"duplicate card",
			(p) => {
				p.cards.push(p.cards[0]);
			}
		],
		[
			"duplicate review",
			(p) => {
				p.reviews.push(p.reviews[0]);
			}
		],
		[
			"duplicate session",
			(p) => {
				p.sessions.push(p.sessions[0]);
			}
		],
		[
			"quota",
			(p) => {
				p.newCardsToday = Array.from({ length: 11 }, (_, i) => String(i));
			}
		],
		[
			"wrong identity",
			(p) => {
				p.cards[0].regionId = "wrong";
			}
		],
		[
			"mature without level 3",
			(p) => {
				p.cards[0].state = "mature";
				p.cards[0].interval = 21;
				p.cards[0].passedLevels = [];
			}
		],
		[
			"unknown review card",
			(p) => {
				p.reviews[0].cardId = "missing";
			}
		],
		[
			"unknown review session",
			(p) => {
				p.reviews[0].sessionId = "missing";
			}
		],
		[
			"invalid first key",
			(p) => {
				p.reviews[0].msToFirstKey = p.reviews[0].elapsedMs + 1;
			}
		],
		[
			"wrong undo answer",
			(p) => {
				p.undo!.reviewId = "missing";
			}
		],
		[
			"corrupt nested undo",
			(p) => {
				p.undo!.before.cards[0].cardId = "wrong";
			}
		]
	];
	for (const [label, mutate] of changes) {
		const corrupt = structuredClone(valid);
		mutate(corrupt);
		assert.throws(() => parseProgress(corrupt), label);
	}
});

test("SR-031: Level 3 accepts a first input at exactly eight seconds and times out after", () => {
	const content = fixture();
	const initial = startSession(reviewing(), content, { id: "timed", mode: "daily", now: NOW });
	const question = nextQuestion(initial, content, { id: "q", now: NOW, level: 3 });
	assert.equal(question.currentQuestion!.limitMs, 8000);
	for (const [firstKey, correct] of [
		[8000, true],
		[8001, false]
	] as const) {
		const answered = applyAnswer(
			question,
			content,
			{
				id: "a",
				sessionId: "timed",
				questionId: "q",
				now: NOW + 11_000,
				msToFirstKey: firstKey,
				answers: [question.currentQuestion!.targets[0].name]
			},
			() => 0.5
		);
		assert.equal(answered.reviews[0].correct, correct);
		assert.equal(answered.reviews[0].timedOut, !correct);
		assert.equal(answered.reviews[0].scheduled, true);
	}
});

test("focused sessions use only learned scope cards and schedule only the ones already due", () => {
	const content = fixture();
	let progress = reviewing();
	progress.cards.find((card) => card.cardId === "be::code2region")!.due = NOW + DAY;
	const before = structuredClone(progress.cards);
	progress = startSession(progress, content, {
		id: "focus",
		mode: "focused",
		scope: { level: "group", id: "island-a" },
		now: NOW,
		random: () => 0.5
	});
	assert.deepEqual(
		new Set(progress.sessions[0].cardIds),
		new Set(["be::code2region", "bd::code2region"])
	);
	for (let i = 0; i < 2; i++) {
		progress = nextQuestion(progress, content, { id: `q-${i}`, now: NOW + i * 2000 });
		progress = answerCurrent(progress, content, `a-${i}`);
	}
	assert.equal(progress.reviews.find((review) => review.regionId === "be")!.scheduled, false);
	assert.equal(progress.reviews.find((review) => review.regionId === "bd")!.scheduled, true);
	assert.equal(
		progress.cards.find((card) => card.cardId === "be::code2region")!.due,
		before[0].due
	);
	assert.ok(progress.sessions[0].completedAt);
	assert.equal(sessionSummary(progress, content, "focus").masteryChange, null);
});

test("unfinished challenge expires at the protected day and a new daily challenge can start", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, {
		id: "old",
		mode: "challenge",
		now: NOW,
		random: () => 0.5
	});
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	const end = progress.clock.nextBoundary;
	assert.throws(() => answerCurrent(progress, content, "late", undefined, end), /expired/);
	assert.throws(() => nextQuestion(progress, content, { id: "late-q", now: end }), /expired/);
	progress = startSession(progress, content, {
		id: "today",
		mode: "challenge",
		now: end,
		random: () => 0.5
	});
	assert.equal(progress.sessions[0].completedAt, end);
	assert.equal(progress.sessions[1].day, 1);
	assert.deepEqual(progress.challengeDays, []);
});

test("statistics separate mature retention, missing timing, weak cards and scope mastery", () => {
	const reviews = [
		raw({ id: "a", correct: true, wasMature: true, msToFirstKey: 100 }),
		raw({ id: "b", correct: false, wasMature: true, msToFirstKey: 300 }),
		raw({ id: "c", correct: true, wasMature: true, scheduled: false, msToFirstKey: null })
	];
	assert.deepEqual(answerStats(reviews), {
		answered: 3,
		correct: 2,
		accuracy: 2 / 3,
		avgMs: 200,
		medianMs: 200,
		matureRetention: 0.5
	});
	const progress = reviewing();
	progress.reviews = [
		...reviews,
		raw({ id: "d", cardId: "bd::code2region", regionId: "bd", correct: false })
	];
	assert.equal(weakCards(progress)[0].card.regionId, "bd");
	assert.equal(
		masteryMap(progress, fixture()).find((scope) => scope.level === "national")!.answered,
		4
	);
});

test("forecast puts overdue cards today, respects 04:00 and excludes new, suspended and day 15", () => {
	const progress = reviewing();
	const cards = progress.cards.filter((card) => card.mode === "code2region");
	cards[0].due = NOW - DAY;
	cards[1].due = progress.clock.nextBoundary - 1;
	cards[2].due = progress.clock.nextBoundary;
	cards[3].due = NOW + 14 * DAY;
	const days = forecast(progress, fixture(), NOW);
	assert.equal(days.length, 14);
	assert.equal(days[0].groups["island-a"], 2);
	assert.equal(days[1].groups["island-b"], 1);
	assert.equal(
		days.reduce((sum, day) => sum + Object.values(day.groups).reduce((a, b) => a + b, 0), 0),
		3
	);
	cards[0].state = "suspended";
	assert.equal(forecast(progress, fixture(), NOW)[0].groups["island-a"], 1);
});

test("streak grace expires after 30 days and completion days are deduplicated", () => {
	const progress = createProgress(fixture(), NOW);
	for (const [days, today, expected] of [
		[[], 0, 0],
		[[0, 0, 1], 1, 2],
		[[0, 2], 2, 2],
		[[0, 2, 4], 4, 1],
		[[0, 2], 5, 0],
		[[0, 2, 30, 32], 32, 2]
	] as [number[], number, number][]) {
		progress.challengeDays = days;
		progress.clock.sequence = today;
		assert.equal(challengeStreak(progress).streak, expected, JSON.stringify(days));
	}
	assert.deepEqual(challengeStreak(progress).graceDays, [1, 31]);
});

test("set sessions select unlocked cards in scope, consume one introduction and complete", () => {
	const content = fixture();
	content.areas.push(
		{ ...content.areas[0], id: "kota-be-2", name: "Lampung Dua" },
		{ ...content.areas[0], id: "kota-be-3", name: "Lampung Tiga" }
	);
	content.regions[0].areas.push(
		{ areaId: "kota-be-2", confidence: "high" },
		{ areaId: "kota-be-3", confidence: "high" }
	);
	let progress = reviewing(content);
	for (const card of progress.cards.filter((card) => card.mode === "code2region"))
		card.interval = 14;
	progress = reconcileContent(progress, content);
	progress = startSession(progress, content, {
		id: "set",
		mode: "set",
		scope: { level: "province", id: "province-be" },
		now: NOW
	});
	assert.deepEqual(progress.sessions[0].cardIds, ["be::setrecall"]);
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	assert.equal(progress.currentQuestion!.format, "set");
	progress = answerCurrent(progress, content, "a");
	assert.equal(progress.reviews[0].scheduled, true);
	assert.deepEqual(progress.newCardsToday, ["be::setrecall"]);
	assert.ok(progress.sessions[0].completedAt);
});

test("sprint sessions draw from every eligible scope card, learned or not", () => {
	const content = fixture();
	const progress = startSession(createProgress(content, NOW, "Asia/Makassar"), content, {
		id: "sprint",
		mode: "sprint",
		scope: { level: "national", id: "indonesia" },
		now: NOW,
		random: () => 0.5
	});
	assert.deepEqual(
		new Set(progress.sessions[0].cardIds.map((cardId) => cardId.split("::")[0])),
		new Set(["be", "bd", "dk", "de"])
	);
});
