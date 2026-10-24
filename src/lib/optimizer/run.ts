import type { Bundle } from "@/core/content/schema";
import type { LearningEvent } from "@/core/log/events";
import type { OptimizeOutcome } from "@/core/optimizer/decide";
import type { ParamsDraft } from "@/core/optimizer/draft";
import { uuidV7 } from "@/core/session/ids";
import { loadState, readEvents, record } from "../db/log";
import { readMeta, type TerkaDb } from "../db/schema";

export type Optimize = (input: {
	events: LearningEvent[];
	bundle: Bundle;
	now: number;
}) => Promise<OptimizeOutcome>;
export type OptimizeResult = "written" | "nothing" | "busy" | "failed";

const LOCK = "terka-optimizer";
export const DIAGNOSTICS_KEY = "diagnostics.optimizer";
export const STEPS_KEY = "diagnostics.steps";

async function fail(db: TerkaDb, at: number, cause: unknown): Promise<"failed"> {
	const reason = cause instanceof Error ? cause.message : String(cause);
	await db.ui_flags.put({ key: DIAGNOSTICS_KEY, value: { at, reason } }).catch(() => {});
	return "failed";
}

async function write(db: TerkaDb, bundle: Bundle, draft: ParamsDraft, now: number) {
	const deviceId = await readMeta<string>(db, "deviceId");
	if (!deviceId) return "nothing";
	const event: LearningEvent = {
		table: "fsrs_params",
		row: { ...draft, id: uuidV7(now, Math.random), deviceId, receivedAt: null, serverSeq: null }
	};
	// Another tab may write between our load and record; one fresh load settles it.
	for (let attempt = 0; attempt < 2; attempt++) {
		const loaded = await loadState(db, bundle);
		if (!loaded.log) return "nothing";
		const result = await record(db, loaded.log, [event], bundle);
		if (result.status === "ok" || result.status === "outdated") return "written";
		if (result.status === "quota") throw new Error("storage is full");
	}
	throw new Error("the log kept changing during the write");
}

// Never throws: a failed optimization keeps the current weights and only leaves a diagnostic.
export async function maybeOptimize(
	db: TerkaDb,
	bundle: Bundle,
	deps: { now: () => number; optimize: Optimize; locks?: LockManager }
): Promise<OptimizeResult> {
	const work = async (): Promise<OptimizeResult> => {
		const now = deps.now();
		try {
			if (!(await readMeta<string>(db, "deviceId"))) return "nothing";
			const { draft, steps } = await deps.optimize({
				events: await readEvents(db),
				bundle,
				now
			});
			if (!draft) return "nothing";
			const written = await write(db, bundle, draft, now);
			if (steps) await db.ui_flags.put({ key: STEPS_KEY, value: { at: now, ...steps } });
			return written;
		} catch (cause) {
			return fail(db, now, cause);
		}
	};
	const locks = deps.locks ?? globalThis.navigator?.locks;
	if (!locks) return work();
	return locks.request(LOCK, { ifAvailable: true }, (lock) => (lock ? work() : "busy"));
}
