import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseContent,
	buildHierarchy,
	createProgress,
	newCard,
	reconcileContent,
	memberAreas,
	regionAreas,
	areaDisplayName
} from "../src/lib/terka/content";
import { boundary, createClock, advanceClock, addDays } from "../src/lib/terka/time";
import { DAY, type CardProgress, type Question } from "../src/lib/terka/model";
import { matchAnswer, gradeAnswer } from "../src/lib/terka/grading";
import {
	dictionary,
	generateQuestion,
	evaluateQuestion,
	assertLevelThreeCoverage,
	automaticLevel,
	questionTimedOut
} from "../src/lib/terka/questions";
import { scheduleAnswer, scheduledDays, retrievability } from "../src/lib/terka/scheduler";
import { fsrs, createEmptyCard, State, Rating, type Grade } from "ts-fsrs";
import plates from "../src/data/plates.json";
import {
	applyAnswer,
	dailyQueue,
	finishSession,
	nextQuestion,
	refreshProgress,
	selectScope,
	learnedCards,
	nextDailyAt,
	startSession,
	undoAnswer,
	setCardSuspended
} from "../src/lib/terka/engine";
import {
	answerStats,
	challengeStreak,
	forecast,
	scopeStats,
	searchReference
} from "../src/lib/terka/statistics";

import { region, fixture, wideFixture, lcg, NOW, raw, reviewing, answerCurrent } from "./fixtures";
import { TIMED_LIMIT_MS, TRUE_FALSE_LIMIT_MS } from "../src/rules";

test("content rejects empty datasets and derives hierarchy from primary provinces", () => {
	assert.throws(() => parseContent({ ...fixture(), regions: [] }));
	assert.equal(parseContent(fixture()).regions.length, 4);
	assert.equal(buildHierarchy(fixture()).filter((scope) => scope.level === "group").length, 3);
	assert.equal(createProgress(fixture(), 1_000_000).cards.length, 4);
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
	assert.equal(createProgress(content, NOW).cards.length, 61);
	for (const region of content.regions) {
		const recall = generateQuestion(content, newCard(region.id, "code2region", NOW), {
			id: region.id,
			now: NOW,
			level: 3
		});
		assert.equal(
			evaluateQuestion(content, recall, [memberAreas(content, region)[0].name]).correct,
			true,
			region.code
		);

		const set = generateQuestion(content, newCard(region.id, "setrecall", NOW), {
			id: region.id,
			now: NOW
		});
		assert.equal(
			evaluateQuestion(content, set, memberAreas(content, region).map(areaDisplayName))
				.setCorrect,
			memberAreas(content, region).length,
			region.code
		);
	}
});

test("verified locations include Solok, Taliabu and both Tangerang jurisdictions", () => {
	const content = parseContent(plates);
	const areas = (code: string) =>
		memberAreas(
			content,
			content.regions.find((region) => region.code === code)!
		);
	const names = (code: string) => areas(code).map(areaDisplayName);
	assert.equal(content.regions.flatMap((region) => region.areas).length, 515);
	assert.equal(content.areas.length, 514);
	assert.ok(names("BA").includes("Kota Solok"));
	assert.ok(names("BA").includes("Kabupaten Solok"));
	assert.ok(names("DG").includes("Kabupaten Pulau Taliabu"));
	for (const code of ["A", "B"]) assert.ok(names(code).includes("Kabupaten Tangerang"));
	assert.ok(names("F").includes("Kota Bogor"));
	assert.ok(names("B").every((name) => !name.includes("Bogor")));
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
	assert.ok(names("S").includes("Kabupaten Mojokerto"));
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
	content.areas.push(
		{
			id: "kota-lampung",
			type: "kota",
			name: "Lampung",
			province: "province-be",
			aliases: ["Kota Satu"],
			variants: []
		},
		{
			id: "kab-lampung",
			type: "kabupaten",
			name: "Lampung",
			province: "province-be",
			aliases: [],
			variants: []
		}
	);
	content.regions[0].areas = [
		{ areaId: "kota-lampung", confidence: "high" },
		{ areaId: "kab-lampung", confidence: "high" }
	];
	content.areas = content.areas.filter((area) => area.id !== "kota-be");
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
	const first = scheduleAnswer(newCard("be", "code2region", NOW), raw({ level: 1 }), [], clock);
	assert.equal(first.due, NOW + 60_000);
	const second = scheduleAnswer(first, raw({ ts: first.due, id: "second", level: 1 }), [], clock);
	assert.equal(second.due, first.due + 600_000);
	const third = scheduleAnswer(second, raw({ ts: second.due, id: "third", level: 1 }), [], clock);
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
	assert.notEqual(scheduleAnswer(card, raw(), [], clock).state, "mature");
	assert.equal(scheduleAnswer(card, raw({ level: 3 }), [], clock).state, "mature");
	assert.equal(
		scheduleAnswer({ ...card, lapses: 7 }, raw({ correct: false }), [], clock).state,
		"suspended"
	);
	const progress = createProgress(fixture(), NOW);
	progress.cards[0] = { ...card, interval: 14 };
	const updated = reconcileContent(progress, fixture());
	assert.ok(updated.cards.some((card) => card.cardId === "be::region2code"));
	// SR-080: one-area codes never get set recall
	assert.equal(
		updated.cards.some((card) => card.cardId === "be::setrecall"),
		false
	);
	const removed = reconcileContent(updated, {
		...fixture(),
		regions: fixture().regions.slice(1)
	});
	assert.equal(removed.cards[0].state, "suspended");
	assert.equal(removed.cards[0].interval, 14);
});

test("SR-129/SR-130: manual suspension keeps D, S and due and restores the previous state", () => {
	const content = fixture();
	const progress = reviewing(content);
	const before = { ...progress.cards[0], due: NOW - DAY };
	progress.cards[0] = before;
	const suspended = setCardSuspended(progress, content, before.cardId, true, NOW);
	assert.equal(suspended.cards[0].state, "suspended");
	assert.equal(suspended.cards[0].resumeState, "review");
	const restored = setCardSuspended(suspended, content, before.cardId, false, NOW + DAY);
	assert.deepEqual(restored.cards[0], { ...before, resumeState: null });
	assert.ok(
		dailyQueue(restored, content, NOW + DAY).some((item) => item.cardId === before.cardId)
	);
});

test("SR-122: a leech is reset to a new card when reactivated", () => {
	const content = fixture();
	const progress = reviewing(content);
	Object.assign(progress.cards[0], { state: "suspended", suspensionReason: "leech", lapses: 8 });
	const card = setCardSuspended(progress, content, progress.cards[0].cardId, false, NOW).cards[0];
	assert.equal(card.state, "new");
	assert.equal(card.lapses, 0);
	assert.equal(card.stability, 0);
});

test("SR-131/SR-132: data-driven suspensions lift themselves when the data returns", () => {
	const content = fixture();
	let progress = reviewing(content);
	const lowered = fixture();
	lowered.regions[0].confidence = "medium";
	progress = reconcileContent(progress, lowered);
	const cardId = `${lowered.regions[0].id}::code2region`;
	assert.equal(progress.cards.find((card) => card.cardId === cardId)!.state, "suspended");
	progress = reconcileContent(progress, fixture());
	const card = progress.cards.find((item) => item.cardId === cardId)!;
	assert.equal(card.state, "review");
	assert.equal(card.stability, 5);
	assert.equal(card.suspensionReason, null);
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
	content.areas = content.regions.map((region) => ({
		id: `kota-${region.id}`,
		type: "kota",
		name: region.region,
		province: region.province,
		aliases: [],
		variants: []
	}));
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
	progress = applyAnswer(progress, content, answer);
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
	for (let index = 0; index < progress.sessions[0].cardIds.length; index++) {
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
	content.areas = content.areas.filter((area) => area.id !== "kota-dk");
	content.areas.push(
		{
			id: "kota-denpasar",
			type: "kota",
			name: "Denpasar",
			province: "province-dk",
			aliases: [],
			variants: []
		},
		{
			id: "kab-badung",
			type: "kabupaten",
			name: "Badung",
			province: "province-dk",
			aliases: [],
			variants: []
		}
	);
	bali.areas = [
		{ areaId: "kota-denpasar", confidence: "high" },
		{ areaId: "kab-badung", confidence: "high" }
	];
	parseContent(content);
	const primary = { ...newCard("dk", "code2region", NOW), state: "review" as const };
	for (const format of ["choice", "truefalse", "not-in"] as const) {
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
				random: () => 0.5
			});
			if (progress.currentQuestion) {
				// SRD 4.7: a brand-new card's first exposure is an ungraded Level 1 intro;
				// every later exposure is forced to Level 3 so the simulation reaches maturity.
				const askedCard = progress.cards.find(
					(card) => card.cardId === progress.currentQuestion!.cardId
				)!;
				if (askedCard.state !== "new" && progress.currentQuestion.level !== 3)
					progress = nextQuestion(progress, content, {
						id: `simulation-${day}-${turn}-level`,
						now,
						level: 3,
						random: () => 0.5
					});
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
	// SR-080: fixture regions have one area each, so one-area codes never get set recall
	assert.equal(
		progress.cards.some((card) => card.mode === "setrecall"),
		false
	);
	assert.ok(
		progress.cards
			.filter((card) => card.mode === "code2region")
			.every((card) => card.state === "mature")
	);
});

test("memberships: medium areas are never answers or distractors; shared areas count for both codes", () => {
	const content = fixture();
	content.areas.push(
		{
			id: "kab-shared",
			type: "kabupaten",
			name: "Shared",
			province: "province-be",
			aliases: [],
			variants: []
		},
		{
			id: "kab-doubt",
			type: "kabupaten",
			name: "Doubt",
			province: "province-be",
			aliases: [],
			variants: []
		}
	);
	const [be, bd] = content.regions;
	be.areas.push(
		{ areaId: "kab-shared", confidence: "high" },
		{ areaId: "kab-doubt", confidence: "medium" }
	);
	bd.areas.push({ areaId: "kab-shared", confidence: "high" });
	parseContent(content);
	assert.deepEqual(
		memberAreas(content, be).map((area) => area.id),
		["kota-be", "kab-shared"]
	);
	assert.equal(regionAreas(content, be).length, 3);
	for (const code of [be, bd]) {
		const question = generateQuestion(content, newCard(code.id, "code2region", NOW), {
			id: code.id,
			now: NOW,
			level: 3
		});
		assert.equal(
			evaluateQuestion(content, question, ["Kabupaten Shared"]).correct,
			true,
			code.code
		);
	}
	const recall = generateQuestion(content, newCard("be", "code2region", NOW), {
		id: "doubt",
		now: NOW,
		level: 3
	});
	assert.equal(evaluateQuestion(content, recall, ["Doubt"]).correct, false);
	const set = generateQuestion(content, newCard("be", "setrecall", NOW), { id: "set", now: NOW });
	assert.equal(
		set.targets.some((target) => target.name.includes("Doubt")),
		false
	);
	for (let seed = 0; seed < 20; seed++) {
		const notIn = generateQuestion(
			content,
			{ ...newCard("bd", "code2region", NOW), state: "review" },
			{
				id: `n${seed}`,
				now: NOW,
				level: 1,
				format: "not-in",
				random: () => (seed + 0.5) / 20
			}
		);
		assert.equal(notIn.targets[0].name.includes("Shared"), false);
	}
});

test("region to code accepts every high code of the shown area", () => {
	const content = fixture();
	content.areas.push({
		id: "kab-shared",
		type: "kabupaten",
		name: "Shared",
		province: "province-be",
		aliases: [],
		variants: []
	});
	const [be, bd] = content.regions;
	be.areas.unshift({ areaId: "kab-shared", confidence: "high" });
	bd.areas.push({ areaId: "kab-shared", confidence: "high" });
	const question = generateQuestion(
		content,
		{ ...newCard("be", "region2code", NOW), state: "review" },
		{
			id: "shared",
			now: NOW,
			level: 2
		}
	);
	assert.match(question.prompt, /Kabupaten Shared/);
	const result = evaluateQuestion(content, question, ["BD"]);
	assert.equal(result.correct, true);
	assert.deepEqual(result.confusedWith, []);
	assert.equal(evaluateQuestion(content, question, ["DK"]).correct, false);
});

test("region to code prompts name the administrative type", () => {
	const content = fixture();
	const question = generateQuestion(
		content,
		{ ...newCard("be", "region2code", NOW), state: "review" },
		{
			id: "r2c",
			now: NOW,
			level: 2
		}
	);
	assert.match(question.prompt, /Kota Lampung/);
	assert.equal(areaDisplayName(content.areas[0]), "Kota Lampung");
});

test("daily countdown targets the next learning step before the day boundary", () => {
	const content = fixture();
	const progress = reviewing(content);
	assert.equal(nextDailyAt(progress, content, NOW), progress.clock.nextBoundary);
	progress.cards[0] = { ...progress.cards[0], state: "relearning", due: NOW + 60_000 };
	assert.equal(nextDailyAt(progress, content, NOW), NOW + 60_000);
});

test("SR-338: typed Level 2 and 3 questions show no partial hint", () => {
	const content = fixture();
	for (const mode of ["code2region", "region2code"] as const)
		for (const level of [2, 3] as const) {
			const card = { ...newCard("be", mode, NOW), state: "review" as const };
			const question = generateQuestion(content, card, {
				id: `${mode}-${level}`,
				now: NOW,
				level
			});
			assert.deepEqual(question.context, [], `${mode} L${level}`);
			assert.deepEqual(question.choices, [], `${mode} L${level}`);
		}
});

test("SR-018/SR-023/SR-340: automatic level follows SRD 3.2 and tests mastery at 21 days", () => {
	const base = newCard("be", "code2region", NOW);
	assert.equal(automaticLevel(base), 1);
	assert.equal(automaticLevel({ ...base, state: "learning" }), 1);
	assert.equal(automaticLevel({ ...base, state: "review", interval: 20 }), 2);
	assert.equal(automaticLevel({ ...base, state: "review", interval: 21 }), 3);
	assert.equal(automaticLevel({ ...base, state: "review", interval: 25, passedLevels: [3] }), 2);
	assert.equal(automaticLevel({ ...base, state: "relearning", interval: 30 }), 2);
	assert.equal(automaticLevel({ ...base, state: "mature", interval: 30, passedLevels: [3] }), 3);
	assert.equal(automaticLevel(newCard("be", "setrecall", NOW)), 3);
});

test("SR-295: a review card at 21+ days is tested at Level 3 and matures on a pass", () => {
	const content = fixture();
	let progress = reviewing(content);
	for (const card of progress.cards)
		Object.assign(card, { interval: 25, stability: 25, lastReview: NOW - 25 * DAY, due: NOW });
	progress = startSession(progress, content, { id: "s", mode: "daily", now: NOW });
	progress = nextQuestion(progress, content, { id: "q", now: NOW });
	assert.equal(progress.currentQuestion!.level, 3);
	assert.equal(progress.currentQuestion!.limitMs, TIMED_LIMIT_MS);
	const cardId = progress.currentQuestion!.cardId;
	progress = answerCurrent(progress, content, "a");
	const card = progress.cards.find((item) => item.cardId === cardId)!;
	assert.ok(card.passedLevels.includes(3));
	assert.equal(card.state, "mature");
});

test("SR-030/SR-031/SR-339/SR-300: typed Level 3 limits the first input; true/false limits the answer", () => {
	const typed = { format: "recall", limitMs: TIMED_LIMIT_MS } as Question;
	assert.equal(questionTimedOut(typed, 11_000, 7_900), false);
	assert.equal(questionTimedOut(typed, 8_000, null), false);
	assert.equal(questionTimedOut(typed, 8_001, null), true);
	assert.equal(questionTimedOut(typed, 9_000, 8_001), true);
	assert.equal(
		questionTimedOut({ format: "recall", limitMs: null } as Question, 20_000, 20_000),
		false
	);
	const trueFalse = { format: "truefalse", limitMs: TRUE_FALSE_LIMIT_MS } as Question;
	assert.equal(questionTimedOut(trueFalse, 2_001, 100), true);
	assert.equal(questionTimedOut(trueFalse, 2_000, 100), false);
});

test("SR-071/SR-072/SR-074: Perkenalan is an ungraded guess that starts the 1-minute step", () => {
	const content = fixture();
	let progress = startSession(createProgress(content, NOW, "Asia/Makassar"), content, {
		id: "s",
		mode: "daily",
		now: NOW
	});
	progress = nextQuestion(progress, content, { id: "q", now: NOW, random: () => 0.5 });
	const question = progress.currentQuestion!;
	assert.equal(question.level, 1);
	assert.throws(
		() => nextQuestion(progress, content, { id: "q", now: NOW, level: 2 }),
		/Perkenalan/
	);
	const other = content.regions.find((region) => region.id !== question.regionId)!;
	const answered = answerCurrent(progress, content, "a", [other.region]);
	const card = answered.cards.find((item) => item.cardId === question.cardId)!;
	const review = answered.reviews[0];
	assert.equal(review.intro, true);
	assert.equal(card.state, "learning");
	assert.equal(card.step, 1);
	assert.equal(card.due, review.ts + 60_000);
	assert.equal(card.stability, 0);
	assert.equal(card.scheduledDay, null);
	assert.deepEqual(card.passedLevels, []);
	assert.deepEqual(answered.confusions, []);
	assert.deepEqual(answered.newCardsToday, [question.cardId]);
	assert.equal(answerStats(answered.reviews).answered, 0);
	const undone = undoAnswer(answered);
	assert.equal(undone.cards.find((item) => item.cardId === question.cardId)!.state, "new");
	assert.deepEqual(undone.newCardsToday, []);
});

test("SR-076: intro guesses never enter the latency percentile", () => {
	const intro = Array.from({ length: 30 }, (_, index) =>
		raw({ id: `i-${index}`, ts: NOW - 1000 + index, msToFirstKey: 2000, intro: true })
	);
	assert.equal(gradeAnswer(raw({ msToFirstKey: 100 }), intro), 3);
});

const areaByName = (content: ReturnType<typeof wideFixture>) =>
	new Map(content.areas.map((area) => [areaDisplayName(area), area]));

test("SR-022/SR-217/SR-218/AC-26: Level 1 choices are scope areas, never members or province names", () => {
	const content = wideFixture();
	const byName = areaByName(content);
	const members = new Set(content.regions[0].areas.map((membership) => membership.areaId));
	const card = { ...newCard("be", "code2region", NOW), state: "review" as const };
	for (let seed = 1; seed <= 20; seed++) {
		const question = generateQuestion(content, card, {
			id: `q${seed}`,
			now: NOW,
			level: 1,
			scope: { level: "group", id: "island-a" },
			random: lcg(seed)
		});
		assert.equal(question.choices.length, 4);
		const areas = question.choices.map((choice) => byName.get(choice));
		assert.ok(areas.every(Boolean), question.choices.join());
		assert.equal(areas.filter((area) => members.has(area!.id)).length, 1);
		assert.ok(
			areas.every((area) =>
				["province-be", "province-bd", "province-bk"].includes(area!.province)
			)
		);
		const right = question.choices.find((choice) => members.has(byName.get(choice)!.id))!;
		assert.equal(evaluateQuestion(content, question, [right]).correct, true);
	}
	const codeCard = { ...newCard("be", "region2code", NOW), state: "review" as const };
	const codes = generateQuestion(content, codeCard, {
		id: "c",
		now: NOW,
		level: 1,
		random: lcg(3)
	});
	assert.equal(codes.choices.length, 4);
	assert.ok(codes.choices.includes("BE"));
	assert.ok(codes.choices.every((choice) => /^[A-Z]{2}$/.test(choice)));
});

test("SR-219/SR-220/SR-297: out-of-scope cards use their own group, then widen nationally", () => {
	const content = wideFixture();
	const byName = areaByName(content);
	const dk = { ...newCard("dk", "code2region", NOW), state: "review" as const };
	const own = generateQuestion(content, dk, {
		id: "dk",
		now: NOW,
		level: 1,
		scope: { level: "group", id: "island-a" },
		random: lcg(1)
	});
	assert.ok(
		own.choices.every((choice) =>
			["province-dk", "province-dr"].includes(byName.get(choice)!.province)
		)
	);
	const de = { ...newCard("de", "code2region", NOW), state: "review" as const };
	const widened = generateQuestion(content, de, {
		id: "de",
		now: NOW,
		level: 1,
		scope: { level: "province", id: "province-de" },
		random: lcg(2)
	});
	assert.equal(widened.choices.length, 4);
});

test("true/false and odd-one-out use areas and record the owner of a wrong area", () => {
	const content = wideFixture();
	const card = { ...newCard("be", "code2region", NOW), state: "review" as const };
	for (let seed = 1; seed <= 10; seed++) {
		const tf = generateQuestion(content, card, {
			id: "t",
			now: NOW,
			level: 1,
			format: "truefalse",
			random: lcg(seed)
		});
		assert.match(tf.prompt, /^BE dipakai Kota .+\.$/);
		if (tf.targets[0].name === "Salah") {
			const result = evaluateQuestion(content, tf, ["Benar"]);
			assert.deepEqual(result.confusedWith, [tf.targets[0].id]);
			assert.notEqual(tf.targets[0].id, "be");
		}
	}
	const notIn = generateQuestion(content, card, {
		id: "n",
		now: NOW,
		level: 1,
		format: "not-in",
		random: lcg(4)
	});
	assert.equal(notIn.choices.length, 4);
	assert.equal(evaluateQuestion(content, notIn, [notIn.targets[0].name]).correct, true);
});

test("every real code builds every Level 1 form", () => {
	const content = parseContent(plates);
	for (const item of content.regions) {
		for (const mode of ["code2region", "region2code"] as const) {
			const card = { ...newCard(item.id, mode, NOW), state: "review" as const };
			const formats =
				mode === "code2region"
					? (["choice", "truefalse", "not-in"] as const)
					: (["choice"] as const);
			for (const format of formats) {
				const question = generateQuestion(content, card, {
					id: `${item.id}-${format}`,
					now: NOW,
					level: 1,
					format,
					random: lcg(7)
				});
				assert.ok(new Set(question.choices).size >= 2, `${item.code} ${mode} ${format}`);
			}
		}
	}
});

test("SR-080/SR-098/SR-100: set recall needs three areas and asks min(5, n − 1)", () => {
	const wide = wideFixture();
	const three = generateQuestion(wide, newCard("be", "setrecall", NOW), { id: "s", now: NOW });
	assert.equal(three.setTarget, 2);
	const twelve = wideFixture();
	const extra = Array.from({ length: 9 }, (_, index) => ({
		...twelve.areas[0],
		id: `kota-be-x${index}`,
		name: `Lampung x${index}`
	}));
	twelve.areas.push(...extra);
	twelve.regions[0].areas.push(
		...extra.map((area) => ({ areaId: area.id, confidence: "high" as const }))
	);
	assert.equal(
		generateQuestion(twelve, newCard("be", "setrecall", NOW), { id: "t", now: NOW }).setTarget,
		5
	);
	const single = fixture();
	const progress = reviewing(single);
	for (const card of progress.cards) card.interval = 14;
	assert.equal(
		reconcileContent(progress, single).cards.some((card) => card.mode === "setrecall"),
		false
	);
	const widened = reviewing(wide);
	for (const card of widened.cards) card.interval = 14;
	assert.ok(
		reconcileContent(widened, wide).cards.some((card) => card.cardId === "be::setrecall")
	);
});

test("SR-149: a challenge with fewer than five learned cards asks each once", () => {
	const content = fixture();
	let progress = startSession(reviewing(content), content, {
		id: "c",
		mode: "challenge",
		now: NOW,
		random: () => 0.5
	});
	const ids = progress.sessions[0].cardIds;
	assert.equal(ids.length, 4);
	assert.equal(new Set(ids).size, 4);
	for (let index = 0; index < ids.length; index++) {
		progress = nextQuestion(progress, content, { id: `q${index}`, now: NOW + index * 2000 });
		progress = answerCurrent(progress, content, `a${index}`);
	}
	assert.notEqual(progress.sessions[0].completedAt, null);
	assert.ok(progress.challengeDays.includes(progress.clock.sequence));
});

test("SR-061/SR-062: reviews are ordered by lowest retrievability, not interval", () => {
	const content = fixture();
	const progress = reviewing(content);
	const set = (id: string, stability: number, overdue: number) =>
		Object.assign(
			progress.cards.find((card) => card.cardId === `${id}::code2region`)!,
			{
				stability,
				interval: stability,
				lastReview: NOW - (stability + overdue) * DAY,
				due: NOW - overdue * DAY
			}
		);
	set("be", 3, 1);
	set("bd", 30, 20);
	set("dk", 10, 0);
	set("de", 60, 1);
	const order = dailyQueue(progress, content, NOW)
		.filter((item) => item.priority === 3)
		.map((item) => item.cardId.split("::")[0]);
	assert.deepEqual(order, ["bd", "be", "de", "dk"]);
	assert.ok(retrievability(progress.cards[1], NOW) < retrievability(progress.cards[0], NOW));
});

test("SR-058: learning steps are priority 1", () => {
	const content = fixture();
	const progress = reviewing(content);
	Object.assign(progress.cards[0], { state: "learning", step: 1, due: NOW - 1 });
	assert.deepEqual(dailyQueue(progress, content, NOW)[0], {
		cardId: progress.cards[0].cardId,
		priority: 1
	});
});

test("SR-063: of two due sibling cards only the lower-R one is shown and the other keeps its due", () => {
	const content = fixture();
	const progress = reviewing(content);
	Object.assign(
		progress.cards.find((card) => card.cardId === "dk::code2region")!,
		{
			stability: 10,
			interval: 10,
			lastReview: NOW - 10 * DAY,
			due: NOW
		}
	);
	progress.cards.push({
		...newCard("dk", "region2code", NOW),
		state: "review",
		stability: 5,
		difficulty: 5,
		interval: 5,
		reps: 2,
		lastReview: NOW - 8 * DAY,
		due: NOW - 3 * DAY
	});
	const queue = dailyQueue(progress, content, NOW).map((item) => item.cardId);
	assert.ok(queue.includes("dk::region2code"));
	assert.ok(!queue.includes("dk::code2region"));
	const refreshed = refreshProgress(progress, content, NOW);
	assert.equal(refreshed.cards.find((card) => card.cardId === "dk::code2region")!.due, NOW);
});

test("SR-015/SR-016: new cards follow the order of plates.json", () => {
	const content = fixture();
	const queue = dailyQueue(createProgress(content, NOW, "Asia/Makassar"), content, NOW);
	assert.deepEqual(
		queue.map((item) => item.cardId),
		["be::code2region", "bd::code2region", "dk::code2region", "de::code2region"]
	);
});

const expectedDays = (card: CardProgress, rating: Grade) =>
	fsrs({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false }).next(
		{
			...createEmptyCard(new Date(card.due)),
			due: new Date(card.due),
			state: State.Review,
			stability: card.stability,
			difficulty: card.difficulty,
			reps: card.reps,
			lapses: card.lapses,
			scheduled_days: card.interval,
			last_review: new Date(card.lastReview!)
		},
		new Date(NOW),
		rating
	).card.scheduled_days;
const within = (value: number, days: number) =>
	value >= Math.round(days * 0.95) && value <= Math.round(days * 1.05);
const strongCard = (): CardProgress => ({
	...newCard("be", "code2region", NOW),
	state: "review",
	stability: 100,
	difficulty: 5,
	interval: 100,
	reps: 5,
	lastReview: NOW - 100 * DAY,
	due: NOW
});

test("SR-050: lapses and finished relearning keep the FSRS interval without an extra cut", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const lapse = scheduleAnswer(strongCard(), raw({ correct: false }), [], clock);
	const lapseDays = expectedDays(strongCard(), Rating.Again);
	assert.ok(lapseDays >= 3);
	assert.ok(within(lapse.interval, lapseDays), `${lapse.interval} vs ${lapseDays}`);
	const relearning = { ...strongCard(), state: "relearning" as const, lapses: 1 };
	const recovered = scheduleAnswer(relearning, raw(), [], clock);
	assert.ok(within(recovered.interval, expectedDays(relearning, Rating.Good)));
});

test("SR-052/SR-053/SR-054/AC-17: fuzz picks the least loaded day and ties follow the answer id", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const card = strongCard();
	const dayStart = (offset: number) => boundary(addDays(clock.day, offset), clock.timezone);
	const busy = (offset: number) =>
		[0, 1].map((index) => ({
			...card,
			cardId: `x${offset}-${index}::code2region`,
			due: dayStart(offset)
		}));
	const loaded = [38, 39, 40, 42].flatMap(busy);
	assert.equal(scheduledDays(40, card, loaded, clock, "a"), 41);
	const ignored = loaded.map((item) => ({ ...item, state: "suspended" as const }));
	assert.equal(
		scheduledDays(40, card, [...ignored, { ...card, due: dayStart(41) }], clock, "same"),
		scheduledDays(40, card, [], clock, "same")
	);
	const picks = new Set(
		"abcdefgh".split("").map((seed) => scheduledDays(40, card, [], clock, seed))
	);
	assert.ok([...picks].every((days) => days >= 38 && days <= 42));
	assert.ok(picks.size > 1);
	assert.equal(scheduledDays(2, card, loaded, clock, "a"), 2);
	assert.equal(scheduledDays(2.4, card, [], clock, "a"), 2);
});

test("SR-057: a scheduled review is due at the start of its learning day", () => {
	const clock = createClock(NOW, "Asia/Makassar");
	const next = scheduleAnswer(strongCard(), raw(), [], clock);
	assert.equal(next.due, boundary(addDays(clock.day, next.interval), clock.timezone));
	assert.equal(Number.isInteger(next.interval), true);
});
