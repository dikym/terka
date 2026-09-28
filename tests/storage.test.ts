import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import Dexie from "dexie";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	createLearningStore,
	createRepository,
	exportBackup,
	restoreBackup
} from "../src/lib/terka/storage";
import { createProgress } from "../src/lib/terka/content";
import {
	automaticBackup,
	backupStatus,
	requestPersistentStorage,
	writeBackup,
	manualBackup,
	acknowledgeManualBackup,
	openLearning,
	type BackupDirectory
} from "../src/lib/terka/backup";
import { DAY, type Content } from "../src/lib/terka/model";
import plates from "../src/data/plates.json";
import { parseContent, parseProgress } from "../src/lib/terka/content";
import { fixture, raw, reviewing, answerCurrent } from "./fixtures";
import { startSession, nextQuestion, refreshProgress, undoAnswer } from "../src/lib/terka/engine";

const content: Content = parseContent(plates);
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
const NOW = Date.parse("2026-09-15T04:00:00Z");

test("repository requires successful read, rejects stale writes and deduplicates retries", async () => {
	const name = `terka-${crypto.randomUUID()}`;
	const first = createRepository(name);
	const second = createRepository(name);
	try {
		const progress = createProgress(content, NOW);
		await assert.rejects(first.commit(0, progress, "before-read"));
		assert.equal(await first.load(), null);
		const saved = await first.commit(0, progress, "create");
		await second.load();
		const next = { ...progress, notices: ["saved"] };
		await first.commit(saved.revision, next, "update");
		await assert.rejects(
			second.commit(saved.revision, { ...progress, notices: ["stale"] }, "stale")
		);
		assert.equal((await first.commit(saved.revision, next, "update")).revision, 2);
		await assert.rejects(first.commit(2, progress, "update"));
		assert.deepEqual((await second.load())!.progress.notices, ["saved"]);
	} finally {
		first.close();
		second.close();
	}
});

test("store only publishes committed state and retries a failed transaction without duplicates", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, content);
	try {
		await client.initialize(NOW, "Asia/Makassar");
		const before = structuredClone(client.store.getState().progress);
		let fail = true;
		const hook = () => {
			if (fail) throw new Error("simulated disk failure");
		};
		repository.db.table("operations").hook("creating", hook);
		await assert.rejects(
			client.dispatch("failed-write", (progress) => ({ ...progress, notices: ["changed"] }))
		);
		assert.equal(client.store.getState().status, "error");
		assert.deepEqual(client.store.getState().progress, before);
		assert.deepEqual((await repository.load())!.progress, before);
		fail = false;
		await client.retry();
		assert.deepEqual(client.store.getState().progress!.notices, ["changed"]);
		assert.equal(client.store.getState().revision, 2);
	} finally {
		repository.close();
	}
});

test("malformed stored data blocks initialization and cannot be silently overwritten", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	try {
		await repository.db
			.table("snapshots")
			.put({ id: "progress", revision: 1, progress: { broken: true } });
		const client = createLearningStore(repository, content);
		await assert.rejects(client.initialize(NOW));
		await assert.rejects(client.dispatch("overwrite", () => createProgress(content, NOW)));
		await assert.rejects(
			repository.commit(1, createProgress(content, NOW), "overwrite-direct")
		);
		assert.deepEqual((await repository.db.table("snapshots").get("progress")).progress, {
			broken: true
		});
	} finally {
		repository.close();
	}
});

test("backup round-trip validates before restore and rejects broken undo or schema versions", async () => {
	const progress = createProgress(content, NOW);
	assert.deepEqual(restoreBackup(exportBackup(progress), content), progress);
	assert.throws(() =>
		restoreBackup(JSON.stringify({ application: "terka", backupVersion: 2, progress }), content)
	);
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, content);
	try {
		await client.initialize(NOW);
		const before = client.store.getState().progress;
		await assert.rejects(
			client.restore(
				'{"application":"terka","backupVersion":1,"progress":{}}',
				"restore-bad",
				NOW
			)
		);
		assert.deepEqual(client.store.getState().progress, before);
		for (const at of [-1, NaN, Infinity])
			await assert.rejects(client.restore(exportBackup(progress), "invalid-time", at));
		assert.deepEqual(client.store.getState().progress, before);
		await client.restore(exportBackup(progress), "restore-valid", NOW);
		assert.equal(client.store.getState().status, "ready");
	} finally {
		repository.close();
	}
});

test("backup write failure never marks success; permissions and persistence failures are explicit", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, content);
	try {
		await client.initialize(NOW);
		const progress = client.store.getState().progress!;
		let aborted = false;
		const directory: BackupDirectory = {
			queryPermission: async () => "granted",
			requestPermission: async () => "granted",
			getFileHandle: async () => ({
				createWritable: async () => ({
					write: async () => {
						throw new Error("disk full");
					},
					close: async () => {},
					abort: async () => {
						aborted = true;
					}
				})
			})
		};
		await assert.rejects(writeBackup(directory, progress, NOW), /disk full/);
		assert.equal(aborted, true);
		assert.equal(client.store.getState().progress!.lastBackupAt, null);
		await assert.rejects(
			writeBackup({ ...directory, queryPermission: async () => "denied" }, progress, NOW),
			/folder/
		);
		assert.equal(
			(await automaticBackup(client, repository, NOW)).status,
			"choose-folder-or-download"
		);
		assert.equal(await requestPersistentStorage(client, { persist: async () => false }), false);
		assert.equal(
			backupStatus({ ...progress, lastBackupAt: NOW }, NOW + 15 * DAY, false).overdue,
			true
		);
		let written = "";
		await writeBackup(
			{
				...directory,
				getFileHandle: async () => ({
					createWritable: async () => ({
						write: async (value) => {
							written = value;
						},
						close: async () => {},
						abort: async () => {}
					})
				})
			},
			progress,
			NOW
		);
		assert.equal(restoreBackup(written, content).lastBackupAt, NOW);
	} finally {
		repository.close();
	}
});

test("restoring an older device backup preserves the logical day of its learning history", async () => {
	const source = fixture();
	const backupStart = NOW - 100 * DAY;
	let backup = createProgress(source, backupStart, "Asia/Makassar");
	// A review card (not a brand-new one) so its answer is FSRS-scheduled, not an ungraded intro.
	for (const card of backup.cards.filter((card) => card.mode === "code2region"))
		Object.assign(card, {
			state: "review",
			stability: 5,
			difficulty: 5,
			interval: 5,
			reps: 3,
			lastReview: backupStart - 5 * DAY
		});
	backup = refreshProgress(backup, source, NOW - DAY);
	backup = startSession(backup, source, { id: "old", mode: "daily", now: NOW - DAY });
	backup = nextQuestion(backup, source, { id: "old-q", now: NOW - DAY });
	backup = answerCurrent(backup, source, "old-a");
	assert.equal(backup.clock.sequence, 99);
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, source);
	try {
		await client.initialize(NOW, "Asia/Makassar");
		const restored = await client.restore(exportBackup(backup), "restore-history", NOW);
		assert.equal(restored.clock.sequence, 100);
		assert.equal(restored.reviews[0].day, 99);
		assert.equal(
			restored.cards.find((card) => card.cardId === restored.reviews[0].cardId)!.scheduledDay,
			99
		);
		assert.deepEqual(restored.reviews, backup.reviews);
		assert.deepEqual(restored.newCardsToday, []);
		assert.equal(restored.currentQuestion, null);
		assert.equal(restored.undo, null);
		assert.deepEqual((await repository.load())!.progress, restored);
	} finally {
		repository.close();
	}
});

test("a same-day restore retains global introductions from both devices", async () => {
	const source = fixture();
	let backup = createProgress(source, NOW - 100 * DAY, "Asia/Makassar");
	backup = refreshProgress(backup, source, NOW);
	backup = startSession(backup, source, { id: "old", mode: "daily", now: NOW });
	backup = nextQuestion(backup, source, { id: "q", now: NOW });
	backup = answerCurrent(backup, source, "a");
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, source);
	try {
		await client.initialize(NOW + 2000, "Asia/Makassar");
		await client.dispatch("quota", (p) => ({
			...p,
			newCardsToday: ["dk::code2region"],
			newPaused: true
		}));
		const restored = await client.restore(exportBackup(backup), "restore", NOW + 3000);
		assert.equal(restored.clock.sequence, 100);
		assert.deepEqual(
			new Set(restored.newCardsToday),
			new Set([...backup.newCardsToday, "dk::code2region"])
		);
		assert.equal(restored.newPaused, true);
	} finally {
		repository.close();
	}
});

test("committed learning state survives repository close, reopen and undo", async () => {
	const source = fixture();
	const name = `terka-${crypto.randomUUID()}`;
	const first = createRepository(name);
	const second = createRepository(name);
	try {
		const client = createLearningStore(first, source);
		await client.initialize(NOW, "Asia/Makassar");
		await client.dispatch("start", (p, c) =>
			startSession(p, c, { id: "session", mode: "daily", now: NOW })
		);
		const question = await client.dispatch("question", (p, c) =>
			nextQuestion(p, c, { id: "q", now: NOW })
		);
		await client.dispatch("answer", (p, c) => answerCurrent(p, c, "a"));
		const saved = client.store.getState().progress!;
		first.close();
		const reopened = createLearningStore(second, source);
		await reopened.initialize(NOW + 2000, "Asia/Makassar");
		assert.deepEqual(reopened.store.getState().progress!.reviews, saved.reviews);
		assert.deepEqual(reopened.store.getState().progress!.cards, saved.cards);
		const undone = await reopened.dispatch("undo", (p) => undoAnswer(p));
		assert.deepEqual(undone.cards, question.cards);
		assert.deepEqual(undone.reviews, []);
		assert.equal(undone.currentQuestion!.shownAt, NOW);
		assert.equal(undone.clock.lastSeen, NOW + 2000);
	} finally {
		first.close();
		second.close();
	}
});

test("simultaneous tab commits have exactly one winner and never combine snapshots", async () => {
	const name = `terka-${crypto.randomUUID()}`;
	const first = createRepository(name);
	const second = createRepository(name);
	try {
		await first.load();
		const original = reviewing();
		await first.commit(0, original, "initial");
		await second.load();
		const results = await Promise.allSettled([
			first.commit(1, { ...original, notices: ["first"] }, "first"),
			second.commit(1, { ...original, notices: ["second"] }, "second")
		]);
		assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
		const winner = results.find((result) => result.status === "fulfilled")!;
		assert.equal(winner.status, "fulfilled");
		if (winner.status === "fulfilled")
			assert.deepEqual((await first.load())!.progress, winner.value.progress);
		assert.equal((await second.load())!.revision, 2);
	} finally {
		first.close();
		second.close();
	}
});

test("automatic backups write weekly, support a forced backup and report revoked permission", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const source = fixture();
	const client = createLearningStore(repository, source);
	let written = "";
	let permission: PermissionState = "granted";
	let writes = 0;
	const directory: BackupDirectory = {
		queryPermission: async () => permission,
		requestPermission: async () => permission,
		getFileHandle: async () => ({
			createWritable: async () => ({
				write: async (value) => {
					written = value;
					writes++;
				},
				close: async () => {},
				abort: async () => {}
			})
		})
	};
	// Native directory handles are browser objects; fake-indexeddb cannot clone them.
	const withDirectory = { ...repository, getLocal: async () => directory };
	try {
		await assert.rejects(automaticBackup(client, withDirectory, NOW), /not ready/);
		await client.initialize(NOW, "Asia/Makassar");
		assert.equal((await automaticBackup(client, withDirectory, NOW)).status, "saved");
		assert.equal(restoreBackup(written, source).lastBackupAt, NOW);
		assert.equal(
			(await automaticBackup(client, withDirectory, NOW + 7 * DAY - 1)).status,
			"current"
		);
		assert.equal(writes, 1);
		assert.equal((await automaticBackup(client, withDirectory, NOW + 7 * DAY)).status, "saved");
		assert.equal(writes, 2);
		assert.equal(
			(await automaticBackup(client, withDirectory, NOW + 7 * DAY + 1, true)).status,
			"saved"
		);
		permission = "denied";
		const savedAt = client.store.getState().progress!.lastBackupAt;
		const failure = await automaticBackup(client, withDirectory, NOW + 8 * DAY, true);
		assert.equal(failure.status, "failed");
		assert.equal(client.store.getState().progress!.lastBackupAt, savedAt);
	} finally {
		repository.close();
	}
});

test("backup close failure preserves the original error even when abort also fails", async () => {
	let aborted = false;
	const directory: BackupDirectory = {
		queryPermission: async () => "granted",
		requestPermission: async () => "granted",
		getFileHandle: async () => ({
			createWritable: async () => ({
				write: async () => {},
				close: async () => {
					throw new Error("close failed");
				},
				abort: async () => {
					aborted = true;
					throw new Error("abort failed");
				}
			})
		})
	};
	await assert.rejects(writeBackup(directory, reviewing(), NOW), /close failed/);
	assert.equal(aborted, true);
});

test("manual download is a valid populated backup and only acknowledgement changes its timestamp", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, fixture());
	try {
		await client.initialize(NOW);
		await client.dispatch("learned", () => reviewing());
		const progress = client.store.getState().progress!;
		const blob = manualBackup(progress);
		assert.equal(blob.type.split(";")[0], "application/json");
		assert.deepEqual(restoreBackup(await blob.text(), fixture()), progress);
		assert.equal(client.store.getState().progress!.lastBackupAt, null);
		for (const at of [NaN, Infinity, -1])
			await assert.rejects(acknowledgeManualBackup(client, at));
		await acknowledgeManualBackup(client, NOW);
		assert.equal(client.store.getState().progress!.lastBackupAt, NOW);
		assert.equal(
			backupStatus(client.store.getState().progress!, NOW + 14 * DAY, true).overdue,
			false
		);
		assert.equal(
			backupStatus(client.store.getState().progress!, NOW + 14 * DAY + 1, true).overdue,
			true
		);
	} finally {
		repository.close();
	}
});

test("persistent storage is requested once after initialization and rejection is recoverable", async () => {
	for (const outcome of ["granted", "denied", "throws"] as const) {
		const repository = createRepository(`terka-${crypto.randomUUID()}`);
		const client = createLearningStore(repository, fixture());
		let calls = 0;
		const storage = {
			persist: async () => {
				calls++;
				if (outcome === "throws") throw new Error("unavailable");
				return outcome === "granted";
			}
		};
		try {
			await assert.rejects(requestPersistentStorage(client, storage));
			await client.initialize(NOW);
			assert.equal(await requestPersistentStorage(client, storage), outcome === "granted");
			assert.equal(await requestPersistentStorage(client, storage), outcome === "granted");
			assert.equal(calls, 1);
			assert.equal(client.store.getState().status, "ready");
		} finally {
			repository.close();
		}
	}
});

test("open learning initializes offline with manual backup fallback", async () => {
	const repository = createRepository(`terka-${crypto.randomUUID()}`);
	const client = createLearningStore(repository, fixture());
	try {
		const result = await openLearning(client, repository, NOW, "Asia/Makassar");
		assert.equal(result.backup.status, "choose-folder-or-download");
		assert.equal(client.store.getState().status, "ready");
		assert.equal(client.store.getState().progress!.clock.lastSeen, NOW);
	} finally {
		repository.close();
	}
});

test("legacy progress with plate, suffix, fact questions and a code scope still loads", () => {
	const content = fixture();
	const progress = reviewing(content);
	const legacy = structuredClone(progress) as unknown as Record<string, unknown> & {
		cards: Record<string, unknown>[];
		sessions: { scope: { level: string; id: string }; cardIds: string[] }[];
	};
	legacy.cards.push({
		...progress.cards[0],
		cardId: "dk::platfull",
		regionId: "dk",
		mode: "platfull"
	});
	legacy.cards.push({
		...progress.cards[0],
		cardId: "dk::suffix::denpasar",
		regionId: "dk",
		mode: "suffix",
		suffixId: "denpasar"
	});
	legacy.activeScope = { level: "code", id: "be" };
	legacy.newCardsToday = ["dk::platfull"];
	legacy.currentQuestion = { ...structuredClone(progress.cards[0]), format: "fact" };
	const loaded = parseProgress(legacy);
	assert.equal(
		loaded.cards.some((card) => card.cardId.includes("platfull")),
		false
	);
	assert.equal(
		loaded.cards.some((card) => card.cardId.includes("::suffix")),
		false
	);
	assert.deepEqual(loaded.activeScope, { level: "national", id: "indonesia" });
	assert.deepEqual(loaded.newCardsToday, []);
	assert.equal(loaded.currentQuestion, null);
});

test("legacy blindrecall cards, reviews and first-letter questions are dropped on load", () => {
	const progress = reviewing(fixture());
	const legacy = structuredClone(progress) as unknown as Record<string, unknown> & {
		cards: Record<string, unknown>[];
		reviews: Record<string, unknown>[];
	};
	legacy.cards.push({
		...progress.cards[0],
		cardId: "dk::blindrecall",
		regionId: "dk",
		mode: "blindrecall"
	});
	legacy.reviews.push({ ...progress.reviews[0], id: "legacy-review", cardId: "dk::blindrecall" });
	legacy.currentQuestion = { ...structuredClone(progress.cards[0]), format: "first-letter" };
	const loaded = parseProgress(legacy);
	assert.equal(
		loaded.cards.some((card) => card.cardId === "dk::blindrecall"),
		false
	);
	assert.equal(
		loaded.reviews.some((review) => review.id === "legacy-review"),
		false
	);
	assert.equal(loaded.currentQuestion, null);
});

test("reviews saved before the intro flag load as graded answers", () => {
	const progress = reviewing(fixture());
	progress.sessions.push({
		id: "session",
		mode: "daily",
		scope: progress.activeScope,
		startedAt: NOW,
		day: progress.clock.sequence,
		cardIds: [],
		answered: 0,
		correct: 0,
		masteryBefore: 0,
		completedAt: null
	});
	progress.reviews.push(raw());
	const legacy = structuredClone(progress) as unknown as { reviews: Record<string, unknown>[] };
	delete legacy.reviews[0].intro;
	assert.equal(parseProgress(legacy).reviews[0].intro, false);
});
