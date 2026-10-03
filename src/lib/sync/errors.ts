import type { TableName } from "@/lib/db/schema";

export type Failure = { status: number; code?: string | null; message?: string | null };
export type BlockReason =
	"dailyLimit" | "totalLimit" | "deviceLimit" | "signupsClosed" | "consentNeeded";
export type Block = {
	scope: TableName | "all" | "logs";
	until: number | null;
	reason: BlockReason;
};
export type Action =
	| { kind: "retry" }
	| { kind: "wait"; until: number }
	| { kind: "reauth" }
	| ({ kind: "block" } & Block)
	| { kind: "reconcile" }
	| { kind: "reject"; reason: string };

const DAY = 86_400_000;
const nextUtcMidnight = (now: number) => Math.floor(now / DAY) * DAY + DAY;

export function classify(
	failure: Failure,
	table: TableName,
	now: number,
	retryAfterSeconds: number | null = null
): Action {
	const { status } = failure;
	const code = failure.code ?? "";
	const message = failure.message ?? "";
	// supabase-js reports a failed fetch with status 0.
	if (status === 0 || status >= 500) return { kind: "retry" };
	if (status === 429) return { kind: "wait", until: now + (retryAfterSeconds ?? 60) * 1000 };
	if (status === 401 || code === "PGRST301" || code === "PGRST303") return { kind: "reauth" };
	switch (code) {
		case "TK001":
			return {
				kind: "block",
				scope: table,
				until: nextUtcMidnight(now),
				reason: "dailyLimit"
			};
		case "TK002":
			return { kind: "block", scope: "all", until: null, reason: "totalLimit" };
		case "TK003":
			return { kind: "block", scope: "all", until: now + DAY, reason: "deviceLimit" };
		case "TK004":
			return { kind: "block", scope: "all", until: now + DAY, reason: "signupsClosed" };
		case "TK005":
			return { kind: "block", scope: "logs", until: null, reason: "consentNeeded" };
		case "TK006":
			return { kind: "reconcile" };
	}
	if (message.includes("review_logs_tz_fkey"))
		return { kind: "reject", reason: "unknown time zone" };
	return { kind: "reject", reason: message || code || `HTTP ${status}` };
}

// Doubles from 1 s up to 5 min; half of each delay is random so devices do not retry in step.
export function backoff(attempt: number, random: () => number): number {
	const cap = Math.min(300_000, 1000 * 2 ** attempt);
	return cap / 2 + random() * (cap / 2);
}

// supabase-js does not expose response headers; this fetch remembers the last Retry-After.
type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function trackRetryAfter(base: Fetch = fetch) {
	let seconds: number | null = null;
	const tracked: Fetch = async (input, init) => {
		const response = await base(input, init);
		const header = response.headers.get("retry-after");
		seconds =
			response.status === 429 && header !== null && /^\d+$/.test(header)
				? Number(header)
				: null;
		return response;
	};
	return { fetch: tracked, retryAfter: () => seconds };
}
