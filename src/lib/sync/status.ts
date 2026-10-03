import type { Block, BlockReason } from "./errors";

const DAY = 86_400_000;

export type SyncFacts = {
	otherAccount: boolean;
	outdated: boolean;
	sessionEnded: boolean;
	online: boolean;
	blocks: Block[];
	lastSyncAt: number | null;
	lastPushAt: number | null;
	// Start of the current run of network or server failures, cleared by a successful push.
	failingSince: number | null;
};

export type SyncStatus = { quarantined: number } & (
	| { state: "otherAccount" | "outdated" | "sessionEnded" | "offline" }
	| { state: BlockReason }
	| { state: "unreachable"; days: number }
	| { state: "pending"; count: number }
	| { state: "synced"; lastSyncAt: number | null }
);

const BLOCK_ORDER: BlockReason[] = [
	"consentNeeded",
	"totalLimit",
	"deviceLimit",
	"signupsClosed",
	"dailyLimit"
];

export const activeBlocks = (blocks: Block[], now: number) =>
	blocks.filter((block) => block.until === null || block.until > now);

export function syncStatus(
	facts: SyncFacts,
	pending: number,
	quarantined: number,
	now: number
): SyncStatus {
	const base = { quarantined };
	if (facts.otherAccount) return { ...base, state: "otherAccount" };
	if (facts.outdated) return { ...base, state: "outdated" };
	if (facts.sessionEnded) return { ...base, state: "sessionEnded" };
	const reasons = new Set(activeBlocks(facts.blocks, now).map((block) => block.reason));
	const blocked = BLOCK_ORDER.find((reason) => reasons.has(reason));
	if (blocked) return { ...base, state: blocked };
	if (facts.failingSince !== null && now - facts.failingSince >= 3 * DAY)
		return {
			...base,
			state: "unreachable",
			days: Math.floor((now - (facts.lastPushAt ?? facts.failingSince)) / DAY)
		};
	if (!facts.online) return { ...base, state: "offline" };
	if (pending > 0) return { ...base, state: "pending", count: pending };
	return { ...base, state: "synced", lastSyncAt: facts.lastSyncAt };
}
