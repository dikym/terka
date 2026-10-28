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
	// Set while a claimed local history is still on its way; the server takes a day's limit at a time.
	claim?: { total: number; pending: number } | null;
};

export type SyncStatus = { quarantined: number; lastSyncAt: number | null } & (
	| { state: "otherAccount" | "outdated" | "sessionEnded" | "offline" }
	| { state: BlockReason }
	| { state: "unreachable"; days: number }
	| { state: "pending"; count: number }
	| { state: "staged"; sent: number; total: number }
	| { state: "synced" }
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
	const base = { quarantined, lastSyncAt: facts.lastSyncAt };
	if (facts.otherAccount) return { ...base, state: "otherAccount" };
	if (facts.outdated) return { ...base, state: "outdated" };
	if (facts.sessionEnded) return { ...base, state: "sessionEnded" };
	const reasons = new Set(activeBlocks(facts.blocks, now).map((block) => block.reason));
	const blocked = BLOCK_ORDER.find((reason) => reasons.has(reason));
	if (blocked === "dailyLimit" && facts.claim) {
		const { total, pending } = facts.claim;
		return {
			...base,
			state: "staged",
			sent: Math.min(total, Math.max(0, total - pending)),
			total
		};
	}
	if (blocked) return { ...base, state: blocked };
	if (facts.failingSince !== null && now - facts.failingSince >= 3 * DAY)
		return {
			...base,
			state: "unreachable",
			days: Math.floor((now - (facts.lastPushAt ?? facts.failingSince)) / DAY)
		};
	if (!facts.online) return { ...base, state: "offline" };
	if (pending > 0) return { ...base, state: "pending", count: pending };
	return { ...base, state: "synced" };
}
