import { describe, expect, test } from "bun:test";
import { createScheduler, type NextRun } from "../../../src/lib/sync/scheduler";

// A clock and timer queue that only move when the test says so.
function fakeTime() {
	let time = 0;
	let next = 1;
	const timers = new Map<number, { at: number; callback: () => void }>();
	return {
		now: () => time,
		setTimer: (callback: () => void, ms: number) => {
			const id = next++;
			timers.set(id, { at: time + ms, callback });
			return id;
		},
		clearTimer: (id: unknown) => void timers.delete(id as number),
		async advance(ms: number) {
			const end = time + ms;
			for (;;) {
				const due = [...timers.entries()]
					.filter(([, timer]) => timer.at <= end)
					.sort((a, b) => a[1].at - b[1].at)[0];
				if (!due) break;
				timers.delete(due[0]);
				time = due[1].at;
				due[1].callback();
				await Bun.sleep(0);
			}
			time = end;
		}
	};
}

function setup(result: () => NextRun = () => null) {
	const clock = fakeTime();
	const runs: number[] = [];
	const scheduler = createScheduler({
		...clock,
		run: async () => {
			runs.push(clock.now());
			return result();
		}
	});
	return { clock, runs, scheduler };
}

const backoff = (at: number): NextRun => ({ at, hold: false });
const hold = (at: number): NextRun => ({ at, hold: true });

describe("sync scheduler", () => {
	test("answers are debounced to one run five seconds after the last one", async () => {
		const { clock, runs, scheduler } = setup();
		scheduler.answered();
		await clock.advance(3000);
		scheduler.answered();
		await clock.advance(4999);
		expect(runs).toEqual([]);
		await clock.advance(1);
		expect(runs).toEqual([8000]);
	});
	test("returning to the page and coming online run at once", async () => {
		const { runs, scheduler } = setup();
		await scheduler.returned();
		await scheduler.kick();
		expect(runs).toEqual([0, 0]);
	});
	test("returning again within fifteen seconds of a run does not start another", async () => {
		const { clock, runs, scheduler } = setup();
		await scheduler.kick();
		await clock.advance(14_999);
		await scheduler.returned();
		expect(runs).toEqual([0]);
		await clock.advance(1);
		await scheduler.returned();
		expect(runs).toEqual([0, 15_000]);
	});
	test("an idle app syncs every five minutes", async () => {
		const { clock, runs } = setup();
		await clock.advance(600_000);
		expect(runs).toEqual([300_000, 600_000]);
	});
	test("a run that asks to wait sets the next run", async () => {
		const { clock, runs, scheduler } = setup(() => (runs.length === 1 ? hold(30_000) : null));
		await scheduler.kick();
		await clock.advance(30_000);
		expect(runs).toEqual([0, 30_000]);
	});
	test("a trigger during a run causes exactly one more run", async () => {
		const clock = fakeTime();
		const runs: number[] = [];
		let release: () => void = () => {};
		const scheduler = createScheduler({
			...clock,
			run: () => {
				runs.push(clock.now());
				return runs.length === 1
					? new Promise((resolve) => (release = () => resolve(null)))
					: Promise.resolve(null);
			}
		});
		const first = scheduler.kick();
		void scheduler.kick();
		void scheduler.kick();
		release();
		await first;
		expect(runs).toHaveLength(2);
	});
	test("a run that throws keeps the interval alive", async () => {
		const { clock, runs, scheduler } = setup(() => {
			if (runs.length === 1) throw new Error("boom");
			return null;
		});
		await scheduler.kick();
		await clock.advance(300_000);
		expect(runs).toEqual([0, 300_000]);
	});
	test("a wait the server asked for holds every trigger until it ends", async () => {
		const { clock, runs, scheduler } = setup(() => (runs.length === 1 ? hold(30_000) : null));
		await scheduler.kick();
		await clock.advance(20_000);
		await scheduler.kick();
		await scheduler.returned();
		scheduler.answered();
		await clock.advance(5_000);
		expect(runs).toEqual([0]);
		await clock.advance(5_000);
		expect(runs).toEqual([0, 30_000]);
	});
	test("a backoff holds answers, but returning or coming online tries again at once", async () => {
		const { clock, runs, scheduler } = setup(() =>
			runs.length === 1 ? backoff(240_000) : null
		);
		await scheduler.kick();
		scheduler.answered();
		await clock.advance(30_000);
		expect(runs).toEqual([0]);
		await scheduler.returned();
		expect(runs).toEqual([0, 30_000]);
		await scheduler.kick();
		expect(runs).toEqual([0, 30_000, 30_000]);
	});
	test("a trigger during a failing run tries again only if it was not an answer", async () => {
		const clock = fakeTime();
		const runs: number[] = [];
		const releases: (() => void)[] = [];
		const scheduler = createScheduler({
			...clock,
			run: () => {
				runs.push(clock.now());
				return new Promise((resolve) => releases.push(() => resolve(backoff(60_000))));
			}
		});
		const first = scheduler.kick();
		scheduler.answered();
		await clock.advance(5_000);
		releases[0]();
		await first;
		expect(runs).toEqual([0]);
		const second = scheduler.kick();
		void scheduler.kick();
		releases[1]();
		await Bun.sleep(0);
		releases[2]();
		await second;
		expect(runs).toEqual([0, 5_000, 5_000]);
	});
	test("a block's end holds answers until it passes", async () => {
		const { clock, runs, scheduler } = setup(() =>
			runs.length === 1 ? backoff(30_000) : null
		);
		await scheduler.kick();
		await clock.advance(10_000);
		scheduler.answered();
		await clock.advance(10_000);
		expect(runs).toEqual([0]);
		await clock.advance(10_000);
		expect(runs).toEqual([0, 30_000]);
	});
	test("a stopped scheduler never runs again", async () => {
		const { clock, runs, scheduler } = setup();
		scheduler.stop();
		await clock.advance(600_000);
		await scheduler.kick();
		expect(runs).toEqual([]);
	});
});
