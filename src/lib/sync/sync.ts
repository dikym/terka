import { isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import type { Bundle } from "@/core/content/schema";
import { loadState, type LogState } from "@/lib/db/log";
import { readMeta, wipesOf, type TerkaDb } from "@/lib/db/schema";
import { backoff, type Action, type Block } from "./errors";
import { runPull } from "./pull";
import { runPush, touchDevice } from "./push";
import { activeBlocks, syncStatus, type SyncStatus } from "./status";

export type SyncContext = {
	now: number;
	random: () => number;
	online: boolean;
	retryAfter: () => number | null;
};
export type SyncResult = { log: LogState; status: SyncStatus; nextAt: number | null };

const put = (db: TerkaDb, key: string, value: unknown) => db.sync_meta.put({ key, value });

async function statusOf(db: TerkaDb, log: LogState, ctx: SyncContext, otherAccount = false) {
	const meta = async <T>(key: string) => (await readMeta<T>(db, key)) ?? null;
	return syncStatus(
		{
			otherAccount,
			outdated: log.outdated,
			sessionEnded: (await meta<boolean>("sessionEnded")) ?? false,
			online: ctx.online,
			blocks: (await meta<Block[]>("blocks")) ?? [],
			lastSyncAt: await meta<number>("lastSyncAt"),
			lastPushAt: await meta<number>("lastPushAt"),
			failingSince: await meta<number>("failingSince")
		},
		await db.outbox.count(),
		await db.outbox_quarantine.count(),
		ctx.now
	);
}

// A round that did not finish backs off (network, server) or waits (Retry-After).
async function failed(
	db: TerkaDb,
	log: LogState,
	ctx: SyncContext,
	action: Action
): Promise<SyncResult> {
	const failures = ((await readMeta<number>(db, "failures")) ?? 0) + 1;
	await put(db, "failures", failures);
	if ((await readMeta<number>(db, "failingSince")) === undefined)
		await put(db, "failingSince", ctx.now);
	const nextAt =
		action.kind === "wait" ? action.until : ctx.now + backoff(failures - 1, ctx.random);
	return { log, status: await statusOf(db, log, ctx), nextAt };
}

async function ended(db: TerkaDb, log: LogState, ctx: SyncContext): Promise<SyncResult> {
	await put(db, "sessionEnded", true);
	return { log, status: await statusOf(db, log, ctx), nextAt: null };
}

const RETRY: Action = { kind: "retry" };

export async function syncNow(
	db: TerkaDb,
	client: SupabaseClient,
	ctx: SyncContext,
	log: LogState,
	bundle: Bundle
): Promise<SyncResult> {
	const { data, error } = await client.auth.getSession();
	if (!data.session) {
		// An expired token that cannot refresh offline is kept by auth-js; that is a network problem.
		if (error && isAuthRetryableFetchError(error)) return failed(db, log, ctx, RETRY);
		return ended(db, log, ctx);
	}
	await put(db, "sessionEnded", false);
	const wipes = await wipesOf(db);
	// Rows of one account must never reach another; claiming and switching accounts belong to sign-in.
	if ((await readMeta<string>(db, "ownerUserId")) !== data.session.user.id)
		return { log, status: await statusOf(db, log, ctx, true), nextAt: null };

	let push = await runPush(db, client, ctx);
	if (push.action?.kind === "reauth") {
		const refreshed = await client.auth.refreshSession();
		if (refreshed.error)
			return isAuthRetryableFetchError(refreshed.error)
				? failed(db, log, ctx, RETRY)
				: ended(db, log, ctx);
		push = await runPush(db, client, ctx);
		if (push.action?.kind === "reauth") return ended(db, log, ctx);
	}
	if (push.action?.kind === "retry" || push.action?.kind === "wait")
		return failed(db, log, ctx, push.action);
	await touchDevice(db, client, ctx.now);

	const pulled = await runPull(db, client, log, bundle, ctx.now, wipes);
	// Signed out or switched account mid-round: the wiped data is not this round's to touch.
	if (pulled.status === "wiped")
		return { log, status: await statusOf(db, log, ctx), nextAt: null };
	let next = log;
	if (pulled.status === "ok" || pulled.status === "outdated") {
		next = pulled.log;
		if (pulled.action?.kind === "reauth") return ended(db, next, ctx);
		if (pulled.action)
			return failed(db, next, ctx, pulled.action.kind === "wait" ? pulled.action : RETRY);
	} else if (pulled.status === "stale") {
		const loaded = await loadState(db, bundle);
		if (loaded.log) next = loaded.log;
	}
	// Only a round that pushed and pulled clears the failure run.
	await db.sync_meta.bulkDelete(["failures", "failingSince"]);
	await put(db, "lastPushAt", ctx.now);
	await put(db, "lastSyncAt", ctx.now);
	const ends = activeBlocks((await readMeta<Block[]>(db, "blocks")) ?? [], ctx.now)
		.map((block) => block.until)
		.filter((until): until is number => until !== null);
	return {
		log: next,
		status: await statusOf(db, next, ctx),
		nextAt: ends.length ? Math.min(...ends) : null
	};
}
