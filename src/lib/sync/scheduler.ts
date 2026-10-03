export type SchedulerDeps = {
	// Resolves to the time the run wants to go again (backoff, Retry-After, a block's end), or null.
	run: () => Promise<number | null>;
	now: () => number;
	setTimer: (callback: () => void, ms: number) => unknown;
	clearTimer: (handle: unknown) => void;
};

const DEBOUNCE_MS = 5_000;
const INTERVAL_MS = 300_000;

export function createScheduler({ run, now, setTimer, clearTimer }: SchedulerDeps) {
	let running = false;
	let again = false;
	let stopped = false;
	// A wait or backoff from the last run; triggers before it only keep the timer.
	let notBefore = 0;
	let wake: unknown = null;
	let debounce: unknown = null;

	const arm = (at: number) => {
		if (wake !== null) clearTimer(wake);
		wake = setTimer(() => void trigger(), Math.max(0, at - now()));
	};

	async function trigger(): Promise<void> {
		if (stopped) return;
		if (now() < notBefore) {
			arm(notBefore);
			return;
		}
		if (running) {
			again = true;
			return;
		}
		running = true;
		let next: number | null = null;
		try {
			next = await run();
		} catch {
			// An unexpected failure must not end syncing; the next interval tries again.
			next = null;
		} finally {
			running = false;
		}
		if (again) {
			again = false;
			return trigger();
		}
		notBefore = next ?? 0;
		arm(next ?? now() + INTERVAL_MS);
	}

	arm(now() + INTERVAL_MS);
	return {
		answered() {
			if (debounce !== null) clearTimer(debounce);
			debounce = setTimer(() => {
				debounce = null;
				void trigger();
			}, DEBOUNCE_MS);
		},
		visible: () => trigger(),
		online: () => trigger(),
		stop() {
			stopped = true;
			if (wake !== null) clearTimer(wake);
			if (debounce !== null) clearTimer(debounce);
		}
	};
}
