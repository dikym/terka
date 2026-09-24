import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseContent,
	buildHierarchy,
	createProgress,
	newCard,
	reconcileContent
} from "../src/lib/terka/content";
import { boundary, createClock, advanceClock } from "../src/lib/terka/time";
import { DAY } from "../src/lib/terka/model";
import { matchAnswer, gradeAnswer } from "../src/lib/terka/grading";
import {
	dictionary,
	generateQuestion,
	evaluateQuestion,
	assertLevelThreeCoverage
} from "../src/lib/terka/questions";
import { scheduleAnswer } from "../src/lib/terka/scheduler";
import plates from "../src/data/plates.json";
import {
	applyAnswer,
	dailyQueue,
	finishSession,
	nextQuestion,
	refreshProgress,
	selectScope,
	learnedCards,
	startSession,
	undoAnswer
} from "../src/lib/terka/engine";
import {
	challengeStreak,
	forecast,
	scopeStats,
	searchReference
} from "../src/lib/terka/statistics";

import { region, fixture, NOW, raw, reviewing, answerCurrent } from "./fixtures";

test("content rejects empty datasets and derives hierarchy from primary provinces", () => {
	assert.throws(() => parseContent({ ...fixture(), regions: [] }));
	assert.equal(parseContent(fixture()).regions.length, 4);
	assert.equal(buildHierarchy(fixture()).filter((scope) => scope.level === "group").length, 3);
	assert.equal(createProgress(fixture(), 1_000_000).cards.length, 8);
});

test("learning day changes at 04:00 and travel cannot advance the boundary", () => {
	const end = boundary("2026-09-16", "Asia/Makassar");
	const clock = createClock(end - 60_000, "Asia/Makassar");
	assert.equal(advanceClock(clock, end - 1).sequence, 0);
	assert.equal(advanceClock(clock, end).sequence, 1);
	const east = advanceClock(clock, end - 30_000, "Asia/Tokyo");
	assert.ok(east.nextBoundary >= clock.nextBoundary);
	const west = advanceClock(clock, end - 30_000, "America/New_York");
	assert.ok(west.nextBoundary > clock.nextBoundary);
});

test("AC-1: all 61 imported codes have a Level 3 question without history", () => {
	const content = parseContent(plates);
	assert.equal(content.regions.length, 61);
	assertLevelThreeCoverage(content);
	assert.equal(createProgress(content, NOW).cards.length, 122);
	for (const region of content.regions) {
		const recall = generateQuestion(content, newCard(region.id, "code2region", NOW), {
			id: region.id,
			now: NOW,
			level: 3
		});
		assert.equal(
			evaluateQuestion(content, recall, [region.areas[0].name]).correct,
			true,
			region.code
		);

		const set = generateQuestion(content, newCard(region.id, "setrecall", NOW), {
			id: region.id,
			now: NOW
		});
		assert.equal(
			evaluateQuestion(
				content,
				set,
				region.areas.map((area) => area.name)
			).setCorrect,
			region.areas.length,
			region.code
		);
	}
});

test("verified locations include Solok, Taliabu and both Tangerang jurisdictions", () => {
	const content = parseContent(plates);
	const areas = (code: string) => content.regions.find((region) => region.code === code)!.areas;
	assert.equal(content.regions.flatMap((region) => region.areas).length, 515);
	assert.equal(
		new Set(content.regions.flatMap((region) => region.areas.map((area) => area.id))).size,
		514
	);
	assert.ok(areas("BA").some((area) => area.name === "Kota Solok"));
	assert.ok(areas("BA").some((area) => area.name === "Kabupaten Solok"));
	assert.ok(areas("DG").some((area) => area.name === "Pulau Taliabu"));
	for (const code of ["A", "B"])
		assert.ok(areas(code).some((area) => area.name === "Kabupaten Tangerang"));
	assert.ok(areas("F").some((area) => area.name === "Kota Bogor"));
	assert.ok(areas("B").every((area) => !area.name.includes("Bogor")));
	assert.ok(
		areas("K")
			.find((area) => area.name === "Blora")!
			.aliases.includes("Cepu")
	);
	assert.deepEqual(
		areas("W")
			.map((area) => area.name)
			.sort(),
		["Gresik", "Sidoarjo"]
	);
	assert.ok(areas("S").some((area) => area.name === "Kabupaten Mojokerto"));
	const solok = generateQuestion(content, newCard("ba", "setrecall", NOW), {
		id: "solok",
		now: NOW
	});
	assert.equal(evaluateQuestion(content, solok, ["Solok"]).ambiguous, true);
	assert.equal(evaluateQuestion(content, solok, ["Kota Solok", "Kabupaten Solok"]).setCorrect, 2);
});

test("AC-7: codes never use typo tolerance; national dictionary precedes fuzzy", () => {
	const content = fixture();
	assert.equal(
		matchAnswer(
			"BD",
			[{ id: "be", name: "BE", aliases: [] }],
			dictionary(content, "code"),
			"code"
		).correct,
		false
	);
	assert.equal(
		matchAnswer("B E", [{ id: "be", name: "BE", aliases: [] }], [], "code").correct,
		false
	);
	const targets = [{ id: "one", name: "Balu", aliases: [] }];
	assert.equal(matchAnswer("Bali", targets, dictionary(content, "name"), "name").correct, false);
	assert.equal(
		matchAnswer("Balu", [{ id: "dk", name: "Bali", aliases: [] }], [], "name").fuzzy,
		true
	);
	assert.equal(
		matchAnswer("Kab. LAMPUNG", [{ id: "be", name: "Lampung", aliases: [] }], [], "name")
			.correct,
		true
	);
});

test("AC-11: grades use raw history, per-level samples and fuzzy/outlier exceptions", () => {
	assert.equal(gradeAnswer(raw(), []), 3);
	assert.equal(gradeAnswer(raw({ fuzzy: true }), []), 2);
	const history = Array.from({ length: 200 }, (_, index) =>
		raw({ id: `old-${index}`, ts: NOW - 1000 + index, msToFirstKey: 2000 + index })
	);
	assert.equal(gradeAnswer(raw(), history), 4);
	assert.equal(gradeAnswer(raw({ level: 3 }), history), 3);
	assert.equal(gradeAnswer(raw({ elapsedMs: 70_000, msToFirstKey: 65_000 }), history), 3);
	assert.equal(gradeAnswer(raw({ correct: false, elapsedMs: 70_000 }), history), 1);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 10_000 }), history), 2);
	assert.equal(
		gradeAnswer(
			raw(),
			history.map((review) => ({ ...review, msToFirstKey: 100 }))
		),
		2
	);
});

test("set answers count unique areas, preserve administrative identity and accept aliases", () => {
	const content = fixture();
	content.regions[0].areas = [
		{ id: "city", name: "Kota Lampung", aliases: ["Kota Satu"] },
		{ id: "county", name: "Kabupaten Lampung", aliases: [] }
	];
	const question = generateQuestion(content, newCard("be", "setrecall", NOW), {
		id: "set",
		now: NOW
	});
	assert.equal(evaluateQuestion(content, question, ["Kota Lampung", "Kota Satu"]).setCorrect, 1);
	assert.equal(
		evaluateQuestion(content, question, ["Kota Lampung", "Kabupaten Lampung"]).setCorrect,
		2
	);
	assert.equal(evaluateQuestion(content, question, ["Lampung"]).ambiguous, true);
});

test("AC-8: minute steps continue without a second memory or daily interval update", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const first = scheduleAnswer(
		newCard("be", "code2region", NOW),
		raw({ level: 1 }),
		[],
		clock,
		() => 0.5
	);
	assert.equal(first.due, NOW + 60_000);
	const second = scheduleAnswer(
		first,
		raw({ ts: first.due, id: "second", level: 1 }),
		[],
		clock,
		() => 0.5
	);
	assert.equal(second.due, first.due + 600_000);
	const third = scheduleAnswer(
		second,
		raw({ ts: second.due, id: "third", level: 1 }),
		[],
		clock,
		() => 0.5
	);
	assert.equal(third.state, "review");
	assert.equal(third.stability, first.stability);
	assert.equal(third.difficulty, first.difficulty);
	assert.equal(third.interval, first.interval);
});

test("AC-2/12: maturity requires Level 3 and lapse 8 suspends; data updates retain histories", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const card = {
		...newCard("be", "code2region", NOW),
		state: "review" as const,
		stability: 100,
		difficulty: 5,
		interval: 100,
		lastReview: NOW - 100 * DAY
	};
	assert.notEqual(scheduleAnswer(card, raw(), [], clock, () => 0.5).state, "mature");
	assert.equal(scheduleAnswer(card, raw({ level: 3 }), [], clock, () => 0.5).state, "mature");
	assert.equal(
		scheduleAnswer({ ...card, lapses: 7 }, raw({ correct: false }), [], clock, () => 0.5).state,
		"suspended"
	);
	const progress = createProgress(fixture(), NOW);
	progress.cards[0] = { ...card, interval: 14 };
	const updated = reconcileContent(progress, fixture());
	assert.ok(updated.cards.some((card) => card.cardId === "be::region2code"));
	assert.ok(updated.cards.some((card) => card.cardId === "be::setrecall"));
	const removed = reconcileContent(updated, {
		...fixture(),
		regions: fixture().regions.slice(1)
	});
	assert.equal(removed.cards[0].state, "suspended");
	assert.equal(removed.cards[0].interval, 14);
});

test("AC-3/4: due reviews ignore scope and new quota survives scope changes", () => {
	const content = fixture();
	let progress = selectScope(reviewing(), content, { level: "province", id: "province-dk" });
	assert.ok(dailyQueue(progress, content, NOW).some((item) => item.cardId === "be::code2region"));
	progress.newCardsToday = Array.from({ length: 10 }, (_, index) => `introduced-${index}`);
	progress = selectScope(progress, content, { level: "national", id: "indonesia" });
	assert.equal(
		dailyQueue(progress, content, NOW).filter((item) => item.priority === 4).length,
		0
	);
	assert.equal(progress.newCardsToday.length, 10);
});

test("AC-5: more than 40 pending reviews pauses new cards for the whole day", () => {
	const content = fixture();
	content.regions = Array.from({ length: 43 }, (_, index) =>
		region(
			`${String.fromCharCode(65 + Math.floor(index / 26))}${String.fromCharCode(65 + (index % 26))}`.toLowerCase(),
			`Area ${index}`,
			index % 2 ? "one" : "two"
		)
	);
	let progress = refreshProgress(reviewing(content), content, NOW);
	assert.equal(progress.newPaused, true);
	progress.cards.forEach((card) => {
		if (card.state === "review") card.due = NOW + DAY;
	});
	progress = refreshProgress(progress, content, NOW + 1000);
	assert.equal(progress.newPaused, true);
	assert.equal(
		dailyQueue(progress, content, NOW + 1000).filter((item) => item.priority === 4).length,
		0
	);
});

test("AC-6/9: lower-level answers keep schedules, record mistakes, and undo restores everything", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, {
		id: "focused",
		mode: "focused",
		scope: { level: "province", id: "province-be" },
		now: NOW
	});
	progress = nextQuestion(progress, content, {
		id: "lower-question",
		now: NOW,
		level: 1,
		random: () => 0.5
	});
	const before = structuredClone(progress);
	progress = answerCurrent(progress, content, "lower-answer", ["Bali"]);
	const card = progress.cards.find((card) => card.cardId === "be::code2region")!;
	const original = before.cards.find((item) => item.cardId === card.cardId)!;
	assert.equal(card.stability, original.stability);
	assert.equal(card.interval, original.interval);
	assert.equal(progress.reviews.at(-1)!.scheduled, false);
	assert.deepEqual(progress.confusions[0].pair, ["be", "dk"]);
	assert.deepEqual(undoAnswer(progress), { ...before, clock: progress.clock, undo: null });
});

test("AC-8/9: a scheduled answer is idempotent and undo restores D/S, due, reps and lapses", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, { id: "daily", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q1", now: NOW, level: 3 });
	const before = structuredClone(progress);
	const answer = {
		id: "a1",
		sessionId: "daily",
		questionId: "q1",
		now: NOW + 1500,
		msToFirstKey: 1000,
		answers: [progress.currentQuestion!.targets[0].name]
	};
	progress = applyAnswer(progress, content, answer, () => 0.5);
	assert.equal(progress.reviews.length, 1);
	assert.deepEqual(applyAnswer(progress, content, answer), progress);
	assert.deepEqual(undoAnswer(progress), { ...before, clock: progress.clock, undo: null });
	assert.throws(() => applyAnswer(before, content, { ...answer, msToFirstKey: 2000 }));
});

test("challenge stays closed until a card has been studied", () => {
	const content = fixture();
	const fresh = createProgress(content, NOW, "Asia/Makassar");
	assert.equal(learnedCards(fresh, content).length, 0);
	assert.throws(() =>
		startSession(fresh, content, { id: "challenge", mode: "challenge", now: NOW })
	);
	assert.ok(learnedCards(reviewing(), content).length > 0);
});

test("challenge is five questions once per day and never changes scheduling", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, {
		id: "challenge",
		mode: "challenge",
		now: NOW,
		random: () => 0.5
	});
	const original = progress.cards.map((card) => ({
		due: card.due,
		stability: card.stability,
		difficulty: card.difficulty,
		interval: card.interval,
		reps: card.reps,
		lapses: card.lapses
	}));
	for (let index = 0; index < 5; index++) {
		progress = nextQuestion(progress, content, { id: `cq${index}`, now: NOW + index * 2000 });
		progress = answerCurrent(progress, content, `ca${index}`);
	}
	assert.deepEqual(
		progress.cards.map((card) => ({
			due: card.due,
			stability: card.stability,
			difficulty: card.difficulty,
			interval: card.interval,
			reps: card.reps,
			lapses: card.lapses
		})),
		original
	);
	assert.deepEqual(progress.challengeDays, [0]);
	assert.throws(() =>
		startSession(progress, content, {
			id: "second-challenge",
			mode: "challenge",
			now: NOW + 20_000
		})
	);
});

test("sprint has a 60-second limit and keeps records per scope", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, {
		id: "sprint",
		mode: "sprint",
		scope: { level: "province", id: "province-be" },
		now: NOW
	});
	progress = nextQuestion(progress, content, { id: "sq", now: NOW, random: () => 0.5 });
	progress = answerCurrent(progress, content, "sa");
	assert.equal(progress.reviews[0].scheduled, false);
	assert.throws(() => finishSession(progress, NOW + 5000));
	progress = finishSession(progress, NOW + 60_000);
	assert.equal(progress.bestScores["province:province-be"], 1);
	assert.equal(progress.bestScores["national:indonesia"], undefined);
});

test("confusions activate at three, clear after five drills and recur at two", () => {
	const content = fixture();
	let progress = reviewing();
	let now = NOW;
	const confuse = () => {
		progress = startSession(progress, content, {
			id: `f-${now}`,
			mode: "focused",
			scope: { level: "province", id: "province-be" },
			now
		});
		progress = nextQuestion(progress, content, { id: `fq-${now}`, now, level: 2 });
		progress = answerCurrent(progress, content, `fa-${now}`, ["Bengkulu"]);
		now += 3000;
	};
	confuse();
	confuse();
	confuse();
	assert.equal(progress.confusions[0].active, true);
	for (let index = 0; index < 5; index++) {
		now += DAY;
		progress.cards.forEach((card) => {
			if (card.state === "relearning") card.due = now + 60_000;
		});
		progress = startSession(progress, content, { id: `drill-${index}`, mode: "daily", now });
		progress = nextQuestion(progress, content, { id: `dq-${index}`, now });
		assert.equal(progress.currentQuestion!.format, "drill");
		progress = answerCurrent(progress, content, `da-${index}`, ["BE"]);
		progress = finishSession(progress, now + 2000);
	}
	assert.equal(progress.confusions[0].active, false);
	now += 3000;
	confuse();
	assert.equal(progress.confusions[0].active, false);
	confuse();
	assert.equal(progress.confusions[0].active, true);
});

test("scope mastery includes cross-scope confusion, stats handle no samples and grace rolls 30 days", () => {
	const content = fixture();
	const progress = reviewing();
	for (const card of progress.cards) {
		card.state = "mature";
		card.interval = 21;
		card.passedLevels = [1, 2, 3];
	}
	progress.confusions.push({
		pair: ["be", "dk"],
		events: [],
		active: true,
		activatedAt: NOW,
		streak: 0,
		resolvedAt: null,
		lastSeen: NOW
	});
	assert.equal(
		scopeStats(progress, content, { level: "province", id: "province-dk" }).mastered,
		false
	);
	assert.equal(
		scopeStats(progress, content, { level: "province", id: "province-dk" }).accuracy,
		null
	);
	assert.equal(forecast(progress, content, NOW).length, 14);
	progress.challengeDays = [0, 1, 3, 4, 6];
	progress.clock.sequence = 6;
	assert.equal(challengeStreak(progress).streak, 1);
	assert.deepEqual(challengeStreak(progress).graceDays, [2]);
	assert.equal(searchReference(parseContent(plates), "PG").regions[0].id, "pg");
});

test("active questions can change level and an unanswered sprint still expires", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, {
		id: "change-level",
		mode: "daily",
		now: NOW
	});
	progress = nextQuestion(progress, content, { id: "initial-level", now: NOW });
	const originalCard = progress.currentQuestion!.cardId;
	progress = nextQuestion(progress, content, {
		id: "changed-level",
		now: NOW + 1000,
		level: 1,
		random: () => 0.5
	});
	assert.equal(progress.currentQuestion!.cardId, originalCard);
	assert.equal(progress.currentQuestion!.level, 1);
	assert.equal(progress.currentQuestion!.autoLevel, 2);
	progress = finishSession(progress, NOW + 2000);
	progress = startSession(progress, content, { id: "expires", mode: "sprint", now: NOW + 3000 });
	progress = nextQuestion(progress, content, {
		id: "unanswered",
		now: NOW + 3000,
		random: () => 0.5
	});
	progress = nextQuestion(progress, content, { id: "expired", now: NOW + 63_000 });
	assert.equal(progress.currentQuestion, null);
	assert.equal(progress.sessions.at(-1)!.completedAt, NOW + 63_000);
});

test("all MVP presentation variants grade correctly", () => {
	const content = fixture();
	const bali = content.regions.find((region) => region.id === "dk")!;
	bali.areas = [
		{ id: "denpasar", name: "Denpasar", aliases: [] },
		{ id: "badung", name: "Badung", aliases: [] }
	];
	parseContent(content);
	const primary = { ...newCard("dk", "code2region", NOW), state: "review" as const };
	for (const format of ["choice", "truefalse", "not-in", "group", "first-letter"] as const) {
		const question = generateQuestion(content, primary, {
			id: format,
			now: NOW,
			level: 1,
			format,
			random: () => 0.5
		});
		assert.equal(
			evaluateQuestion(content, question, [question.targets[0].name]).correct,
			true,
			format
		);
	}
});

test("content revision changes clear stale questions and undo without losing existing cards", () => {
	const content = fixture();
	let progress = startSession(reviewing(), content, { id: "revision", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "before-update", now: NOW });
	const updated = reconcileContent(progress, { ...content, sourceRevision: "updated-source" });
	assert.equal(updated.currentQuestion, null);
	assert.deepEqual(updated.cards, progress.cards);
	assert.equal(updated.contentRevision, "updated-source");
});

test("daily learning can finish minute steps and eventually unlock and mature both directions", () => {
	const content = fixture();
	let progress = createProgress(content, NOW, "Asia/Makassar");
	for (let day = 0; day < 60; day++) {
		let now = NOW + day * DAY;
		progress = startSession(progress, content, { id: `simulation-${day}`, mode: "daily", now });
		for (let turn = 0; turn < 40; turn++) {
			progress = nextQuestion(progress, content, {
				id: `simulation-${day}-${turn}`,
				now,
				level: 3,
				random: () => 0.5
			});
			if (progress.currentQuestion) {
				progress = answerCurrent(progress, content, `simulation-answer-${day}-${turn}`);
				now += 2000;
			} else {
				const steps = progress.cards
					.filter((card) => card.state === "learning" || card.state === "relearning")
					.map((card) => card.due)
					.filter((due) => due > now && due < NOW + day * DAY + 3_600_000);
				if (!steps.length) break;
				now = Math.min(...steps);
			}
		}
		progress = finishSession(progress, now);
		assert.ok(progress.newCardsToday.length <= 10);
	}
	assert.ok(
		progress.cards.some((card) => card.mode === "region2code" && card.state === "mature")
	);
	assert.ok(progress.cards.some((card) => card.mode === "setrecall"));
	assert.ok(
		progress.cards
			.filter((card) => card.mode === "code2region")
			.every((card) => card.state === "mature")
	);
});
