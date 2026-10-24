import { describe, expect, test } from "bun:test";
import * as binding from "@open-spaced-repetition/binding";
import { default_w } from "ts-fsrs";
import { optimizeLog } from "../../../src/core/optimizer/decide";
import type { Trainer } from "../../../src/core/optimizer/items";
import { paramsAt } from "../../../src/core/replay/params";
import { seeded } from "../../../src/core/random";
import { ensureDevice } from "../../../src/lib/db/device";
import { loadState, record } from "../../../src/lib/db/log";
import { TerkaDb } from "../../../src/lib/db/schema";
import { maybeOptimize, type Optimize } from "../../../src/lib/optimizer/run";
import { createTrainer } from "../../../src/lib/optimizer/trainer";
import { freshDb } from "../db/fixtures";
import { AFTER_LOG, bundle, eligibleLog } from "./fixtures";

const native = createTrainer(binding);
const optimizeWith =
	(trainer: Trainer): Optimize =>
	(input) =>
		optimizeLog(input, trainer);
const worse: Trainer = {
	...native,
	evaluate: async (weights, items) => {
		const metrics = await native.evaluate(weights, items);
		return weights === default_w || weights.join() === default_w.join()
			? { logLoss: metrics.logLoss / 2, rmse: metrics.rmse / 2 }
			: metrics;
	}
};

async function seededDb(): Promise<TerkaDb> {
	const db = freshDb();
	await ensureDevice(db, {
		now: AFTER_LOG,
		random: seeded("device"),
		label: "Test",
		platform: "test"
	});
	const loaded = await loadState(db, bundle);
	if (loaded.status !== "ok") throw new Error("expected a usable state");
	const result = await record(db, loaded.log, eligibleLog(), bundle);
	if (result.status !== "ok") throw new Error(`seed failed: ${result.status}`);
	return db;
}

const deps = (optimize: Optimize) => ({ now: () => AFTER_LOG, optimize });

describe("maybeOptimize", () => {
	test("writes and queues an active row that later answers use", async () => {
		const db = await seededDb();
		expect(await maybeOptimize(db, bundle, deps(optimizeWith(native)))).toBe("written");
		const rows = await db.fsrs_params.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ status: "active", activatedAt: AFTER_LOG });
		expect(rows[0].trainingEventIds!.length).toBe(rows[0].trainedReviewCount);
		const queued = await db.outbox.toArray();
		expect(queued.some((item) => item.table === "fsrs_params" && item.key === rows[0].id)).toBe(
			true
		);
		const loaded = await loadState(db, bundle);
		if (loaded.status !== "ok") throw new Error("expected a usable state");
		expect(paramsAt(loaded.log.state.params, AFTER_LOG)?.id).toBe(rows[0].id);
	}, 60_000);

	test("stores the learning step suggestion for the diagnostic screen", async () => {
		const db = await seededDb();
		await maybeOptimize(db, bundle, deps(optimizeWith(native)));
		const steps = (await db.ui_flags.get("diagnostics.steps"))?.value as {
			at: number;
			learning: unknown[];
			relearning: unknown[];
		};
		expect(steps.at).toBe(AFTER_LOG);
		expect(steps.learning.every((value) => typeof value === "number")).toBe(true);
		expect(steps.relearning.every((value) => typeof value === "number")).toBe(true);
	}, 60_000);

	test("a failing step suggestion still writes the decision", async () => {
		const db = await seededDb();
		const failing: Trainer = {
			...native,
			steps: async () => {
				throw new Error("no step data");
			}
		};
		expect(await maybeOptimize(db, bundle, deps(optimizeWith(failing)))).toBe("written");
		expect(await db.fsrs_params.count()).toBe(1);
		expect(await db.ui_flags.get("diagnostics.steps")).toBeUndefined();
	}, 60_000);

	test("keeps the current weights and stores the rejection when the result is not better", async () => {
		const db = await seededDb();
		expect(await maybeOptimize(db, bundle, deps(optimizeWith(worse)))).toBe("written");
		const rows = await db.fsrs_params.toArray();
		expect(rows[0]).toMatchObject({ status: "rejected", activatedAt: null });
		const loaded = await loadState(db, bundle);
		if (loaded.status !== "ok") throw new Error("expected a usable state");
		expect(loaded.log.state.params).toEqual([]);
	}, 60_000);

	test("records a failure for diagnostics and writes nothing", async () => {
		const db = await seededDb();
		const broken: Optimize = async () => {
			throw new Error("wasm failed to load");
		};
		expect(await maybeOptimize(db, bundle, deps(broken))).toBe("failed");
		expect(await db.fsrs_params.count()).toBe(0);
		expect((await db.ui_flags.get("diagnostics.optimizer"))?.value).toEqual({
			at: AFTER_LOG,
			reason: "wasm failed to load"
		});
	});

	test("does nothing while another optimization holds the lock", async () => {
		const db = await seededDb();
		const locks = {
			request: async (_name: string, _options: object, work: (lock: null) => unknown) =>
				work(null)
		} as unknown as LockManager;
		expect(await maybeOptimize(db, bundle, { ...deps(optimizeWith(native)), locks })).toBe(
			"busy"
		);
		expect(await db.fsrs_params.count()).toBe(0);
	});

	test("does nothing for a log that is not eligible", async () => {
		const db = freshDb();
		await ensureDevice(db, {
			now: AFTER_LOG,
			random: seeded("device"),
			label: "Test",
			platform: "test"
		});
		expect(await maybeOptimize(db, bundle, deps(optimizeWith(native)))).toBe("nothing");
	});
});
