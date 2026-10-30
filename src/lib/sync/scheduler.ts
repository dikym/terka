// When a run wants to go again: a backoff or a block's end, or a wait the server asked for (hold).
export type NextRun = { at: number; hold: boolean } | null;

export type SchedulerDeps = {
	run: () => Promise<NextRun>;
	now: () => number;
	setTimer: (callback: () => void, ms: number) => unknown;
	clearTimer: (handle: unknown) => void;
};

const DEBOUNCE_MS = 5_000;
// A fallback: other devices' changes normally arrive with their nudge, the page's return or reconnecting.
const INTERVAL_MS = 300_000;
// Switching windows back and forth should not start a round each time.
const RETURN_GAP_MS = 15_000;

type Reason = "answer" | "return" | "kick" | "timer";

export function createScheduler({ run, now, setTimer, clearTimer }: SchedulerDeps) {
	let running = false;
	// A trigger that came during a run; an answer yields to any other reason.
	let again: Reason | null = null;
	let stopped = false;
	// The server asked to wait (Retry-After): nothing runs before it.
	let holdUntil = 0;
	// A backoff or a block's end holds answers only; returning or coming online tries again at once.
	let backoffUntil = 0;
	let lastStart = Number.NEGATIVE_INFINITY;
	let wake: unknown = null;
	let debounce: unknown = null;

	const arm = (at: number) => {
		if (wake !== null) clearTimer(wake);
		wake = setTimer(() => void trigger("timer"), Math.max(0, at - now()));
	};

	async function trigger(reason: Reason): Promise<void> {
		if (stopped) return;
		const waitUntil = reason === "answer" ? Math.max(holdUntil, backoffUntil) : holdUntil;
		if (now() < waitUntil) {
			arm(waitUntil);
			return;
		}
		if (running) {
			if (again === null || again === "answer") again = reason;
			return;
		}
		running = true;
		lastStart = now();
		let next: NextRun = null;
		try {
			next = await run();
		} catch {
			// An unexpected failure must not end syncing; the next interval tries again.
			next = null;
		} finally {
			running = false;
		}
		if (stopped) return;
		holdUntil = next?.hold ? next.at : 0;
		backoffUntil = next && !next.hold ? next.at : 0;
		if (again) {
			const reason = again;
			again = null;
			return trigger(reason);
		}
		arm(next?.at ?? now() + INTERVAL_MS);
	}

	arm(now() + INTERVAL_MS);
	return {
		answered() {
			if (debounce !== null) clearTimer(debounce);
			debounce = setTimer(() => {
				debounce = null;
				void trigger("answer");
			}, DEBOUNCE_MS);
		},
		/** The page is shown or focused again: pick up what other devices sent meanwhile. */
		returned: () =>
			now() - lastStart >= RETURN_GAP_MS ? trigger("return") : Promise.resolve(),
		/** Runs at once unless the server asked to wait: the app opened, came back online or was nudged. */
		kick: () => trigger("kick"),
		stop() {
			stopped = true;
			if (wake !== null) clearTimer(wake);
			if (debounce !== null) clearTimer(debounce);
		}
	};
}
