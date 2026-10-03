import { describe, expect, test } from "bun:test";
import { createScheduler } from "../../../src/lib/sync/scheduler";

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

function setup(result: () => number | null = () => null) {
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
	test("visibility and coming online run at once", async () => {
		const { runs, scheduler } = setup();
		await scheduler.visible();
		await scheduler.online();
		expect(runs).toEqual([0, 0]);
	});
	test("an idle app syncs every five minutes", async () => {
		const { clock, runs } = setup();
		await clock.advance(600_000);
		expect(runs).toEqual([300_000, 600_000]);
	});
	test("a run that asks to wait sets the next run", async () => {
		const { clock, runs, scheduler } = setup(() => (runs.length === 1 ? 30_000 : null));
		await scheduler.online();
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
		const first = scheduler.online();
		void scheduler.visible();
		void scheduler.visible();
		release();
		await first;
		expect(runs).toHaveLength(2);
	});
	test("a run that throws keeps the interval alive", async () => {
		const { clock, runs, scheduler } = setup(() => {
			if (runs.length === 1) throw new Error("boom");
			return null;
		});
		await scheduler.online();
		await clock.advance(300_000);
		expect(runs).toEqual([0, 300_000]);
	});
	test("a wait holds triggers until it ends", async () => {
		const { clock, runs, scheduler } = setup(() => (runs.length === 1 ? 30_000 : null));
		await scheduler.online();
		await clock.advance(10_000);
		await scheduler.visible();
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
		await scheduler.online();
		expect(runs).toEqual([]);
	});
});
