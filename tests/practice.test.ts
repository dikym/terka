import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import Dexie from "dexie";
import { createRepository, createLearningStore } from "../src/lib/terka/storage";
import {
	beginPractice,
	answerPractice,
	practiceFeedback,
	undoPractice
} from "../src/lib/terka/practice";
import { fixture, NOW, reviewing } from "./fixtures";
import { createProgress } from "../src/lib/terka/content";
import { nextQuestion, finishSession } from "../src/lib/terka/engine";

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

test("UI session commands persist feedback, resume after reload and undo the last answer", async () => {
	const repository = createRepository(`ui-${crypto.randomUUID()}`);
	const content = fixture();
	const client = createLearningStore(repository, content);
	try {
		await client.initialize(NOW);
		await client.dispatch("start", (progress) =>
			beginPractice(progress, content, "daily", NOW, "session")
		);
		const question = client.store.getState().progress!.currentQuestion!;
		await client.dispatch("answer", (progress) =>
			answerPractice(progress, content, [question.targets[0].name], 500, NOW + 1000, "answer")
		);
		assert.equal(practiceFeedback(client.store.getState().progress!)?.review.correct, true);
		const reopened = createLearningStore(repository, content);
		await reopened.initialize(NOW + 2000);
		const saved = reopened.store.getState().progress!;
		const resumed = beginPractice(saved, content, "daily", NOW + 2000, "other");
		assert.equal(resumed.sessions.length, 1);
		assert.equal(practiceFeedback(resumed)?.question.id, question.id);
		const undone = undoPractice(resumed, NOW + 3000);
		assert.equal(undone.reviews.length, 0);
		assert.equal(undone.currentQuestion?.shownAt, NOW + 3000);
		assert.equal(undone.cards.find((card) => card.cardId === question.cardId)?.reps, 0);
	} finally {
		await repository.db.delete();
	}
});

test("timed UI submissions record expiry; a finished sprint never accepts a late answer", () => {
	const content = fixture();
	let progress = beginPractice(createProgress(content, NOW), content, "daily", NOW, "daily");
	progress = nextQuestion(progress, content, { id: "timed", now: NOW, level: 3 });
	progress = answerPractice(
		progress,
		content,
		[progress.currentQuestion!.targets[0].name],
		null,
		NOW + 8001,
		"late"
	);
	assert.equal(practiceFeedback(progress)?.review.timedOut, true);
	progress = finishSession(progress, NOW + 9000);
	progress = beginPractice(progress, content, "sprint", NOW + 10000, "sprint");
	progress = answerPractice(
		progress,
		content,
		[progress.currentQuestion!.targets[0].name],
		100,
		NOW + 70001,
		"too-late"
	);
	assert.equal(progress.reviews.length, 1);
	assert.equal(progress.sessions.at(-1)?.completedAt, NOW + 70001);
});

test("a restored active session without an in-flight question resumes the engine queue", () => {
	const content = fixture();
	const progress = beginPractice(createProgress(content, NOW), content, "daily", NOW, "daily");
	progress.currentQuestion = null;
	progress.undo = null;
	const resumed = beginPractice(progress, content, "daily", NOW + 1000, "resume");
	assert.equal(resumed.sessions.length, 1);
	assert.ok(resumed.currentQuestion);
});

test("starting another mode closes an open daily session instead of resuming it", () => {
	const content = fixture();
	let progress = beginPractice(reviewing(content), content, "daily", NOW, "daily");
	progress = beginPractice(progress, content, "sprint", NOW + 1000, "sprint");
	assert.equal(progress.sessions.length, 2);
	assert.equal(progress.sessions[0].completedAt, NOW + 1000);
	assert.equal(progress.sessions[1].mode, "sprint");
});
