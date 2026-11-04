import { isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import type { Bundle } from "@/core/content/schema";
import { checkRemoved, leaveRemovedDevice, rememberSession } from "@/lib/auth/removal";
import { loadState, type LogState } from "@/lib/db/log";
import { readMeta, wipesOf, type TerkaDb } from "@/lib/db/schema";
import { backoff, type Action, type Block } from "@/lib/sync/errors";
import { runPull } from "@/lib/sync/pull";
import { runPush, touchDevice } from "@/lib/sync/push";
import { adoptServerReset } from "@/lib/sync/reset";
import { requeueLostCloses } from "@/lib/sync/reconcile";
import { activeBlocks, syncStatus, type SyncStatus } from "@/lib/sync/status";

export type SyncContext = {
	now: number;
	random: () => number;
	online: boolean;
	retryAfter: () => number | null;
};
// hold: nextAt is a wait the server asked for, which every trigger respects.
// sent: rows this round pushed, even if it failed later; other devices then have something to pull.
export type SyncResult = {
	log: LogState;
	status: SyncStatus;
	nextAt: number | null;
	hold: boolean;
	sent: number;
};
type RoundResult = Omit<SyncResult, "sent">;

const put = (db: TerkaDb, key: string, value: unknown) => db.sync_meta.put({ key, value });

// A claimed local history is reported until its last answer has left the outbox.
export async function claimFacts(db: TerkaDb): Promise<{ total: number; pending: number } | null> {
	const claim = await readMeta<{ total: number }>(db, "claim");
	if (!claim) return null;
	const pending = await db.outbox.filter((item) => item.table === "review_logs").count();
	if (pending > 0) return { total: claim.total, pending };
	await db.sync_meta.delete("claim");
	return null;
}

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
			failingSince: await meta<number>("failingSince"),
			claim: await claimFacts(db)
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
): Promise<RoundResult> {
	const failures = ((await readMeta<number>(db, "failures")) ?? 0) + 1;
	await put(db, "failures", failures);
	if ((await readMeta<number>(db, "failingSince")) === undefined)
		await put(db, "failingSince", ctx.now);
	const nextAt =
		action.kind === "wait" ? action.until : ctx.now + backoff(failures - 1, ctx.random);
	return { log, status: await statusOf(db, log, ctx), nextAt, hold: action.kind === "wait" };
}

// Removed from another device: leave as Keluar does. Rows pushed earlier in the round stay sent.
async function removed(
	db: TerkaDb,
	client: SupabaseClient,
	log: LogState,
	bundle: Bundle
): Promise<RoundResult> {
	await leaveRemovedDevice(db, client);
	const loaded = await loadState(db, bundle);
	return {
		log: loaded.log ?? log,
		status: { state: "removed", quarantined: 0, lastSyncAt: null },
		nextAt: null,
		hold: false
	};
}

// A session can end for reasons other than removal; only the server's yes wipes this device.
async function ended(
	db: TerkaDb,
	client: SupabaseClient,
	log: LogState,
	ctx: SyncContext,
	bundle: Bundle
): Promise<RoundResult> {
	if ((await checkRemoved(db, client)) === "removed") return removed(db, client, log, bundle);
	await put(db, "sessionEnded", true);
	return { log, status: await statusOf(db, log, ctx), nextAt: null, hold: false };
}

const RETRY: Action = { kind: "retry" };

export async function syncNow(
	db: TerkaDb,
	client: SupabaseClient,
	ctx: SyncContext,
	log: LogState,
	bundle: Bundle
): Promise<SyncResult> {
	const pushed = { sent: 0 };
	const result = await round(db, client, ctx, log, bundle, pushed);
	return { ...result, sent: pushed.sent };
}

async function round(
	db: TerkaDb,
	client: SupabaseClient,
	ctx: SyncContext,
	log: LogState,
	bundle: Bundle,
	pushed: { sent: number }
): Promise<RoundResult> {
	const { data, error } = await client.auth.getSession();
	if (!data.session) {
		// An expired token that cannot refresh offline is kept by auth-js; that is a network problem.
		if (error && isAuthRetryableFetchError(error)) return failed(db, log, ctx, RETRY);
		return ended(db, client, log, ctx, bundle);
	}
	const sessionId = await rememberSession(db, data.session.access_token);
	await put(db, "sessionEnded", false);
	// Rows of one account must never reach another; claiming and switching accounts belong to sign-in.
	if ((await readMeta<string>(db, "ownerUserId")) !== data.session.user.id)
		return { log, status: await statusOf(db, log, ctx, true), nextAt: null, hold: false };

	// Before anything is sent: a reset elsewhere must not get this device's old rows back.
	const reset = await adoptServerReset(db, client, ctx.now);
	if (reset.action?.kind === "reauth") return ended(db, client, log, ctx, bundle);
	if (reset.action)
		return failed(db, log, ctx, reset.action.kind === "wait" ? reset.action : RETRY);
	if (reset.wiped) {
		const loaded = await loadState(db, bundle);
		if (loaded.log) log = loaded.log;
	}
	const wipes = await wipesOf(db);

	await requeueLostCloses(db, client, wipes);
	let push = await runPush(db, client, ctx);
	pushed.sent += push.sent;
	if (push.action?.kind === "reauth") {
		const refreshed = await client.auth.refreshSession();
		if (refreshed.error)
			return isAuthRetryableFetchError(refreshed.error)
				? failed(db, log, ctx, RETRY)
				: ended(db, client, log, ctx, bundle);
		push = await runPush(db, client, ctx);
		pushed.sent += push.sent;
		if (push.action?.kind === "reauth") return ended(db, client, log, ctx, bundle);
	}
	if (push.action?.kind === "retry" || push.action?.kind === "wait")
		return failed(db, log, ctx, push.action);
	await touchDevice(db, client, ctx.now);
	if ((await checkRemoved(db, client, sessionId)) === "removed")
		return removed(db, client, log, bundle);

	const pulled = await runPull(db, client, log, bundle, ctx.now, wipes);
	// Signed out or switched account mid-round: the wiped data is not this round's to touch.
	if (pulled.status === "wiped") {
		const loaded = await loadState(db, bundle);
		const fresh = loaded.log ?? log;
		return { log: fresh, status: await statusOf(db, fresh, ctx), nextAt: null, hold: false };
	}
	let next = log;
	if (pulled.status === "ok" || pulled.status === "outdated") {
		next = pulled.log;
		if (pulled.action?.kind === "reauth") return ended(db, client, next, ctx, bundle);
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
		nextAt: ends.length ? Math.min(...ends) : null,
		hold: false
	};
}
