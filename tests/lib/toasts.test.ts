import { describe, expect, test } from "bun:test";
import { createToasts, stackLayout, type ToastItem } from "@/lib/toasts";

// Collects scheduled callbacks so a test can run them when it wants.
function manualTimers() {
	const pending: { run: () => void; ms: number }[] = [];
	return {
		schedule: (run: () => void, ms: number) => {
			const timer = { run, ms };
			pending.push(timer);
			return () => {
				pending.splice(pending.indexOf(timer), 1);
			};
		},
		pending
	};
}

const live = (toasts: ReturnType<typeof createToasts>) =>
	toasts.store.getState().items.filter((item) => !item.leaving);

describe("toasts", () => {
	test("at most three show, the newest last", () => {
		const toasts = createToasts(manualTimers().schedule);
		for (const text of ["a", "b", "c", "d"]) toasts.show({ tone: "warn", text });
		expect(live(toasts).map((item) => item.text)).toEqual(["b", "c", "d"]);
	});

	test("success hides by itself after ten seconds, other tones stay", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		toasts.show({ tone: "success", text: "Data diekspor" });
		toasts.show({ tone: "info", text: "Sedang offline." });
		toasts.show({ tone: "danger", text: "Perubahan belum tersimpan. Coba lagi." });
		expect(timers.pending.map((timer) => timer.ms)).toEqual([10_000]);
		timers.pending[0].run();
		expect(live(toasts).map((item) => item.tone)).toEqual(["info", "danger"]);
	});

	test("a toast with the same key replaces the earlier one", () => {
		const toasts = createToasts(manualTimers().schedule);
		toasts.show({ tone: "info", text: "Sedang offline.", key: "sync" });
		toasts.show({ tone: "info", text: "Tersinkron", key: "sync" });
		expect(live(toasts).map((item) => item.text)).toEqual(["Tersinkron"]);
	});

	test("closing a toast runs its close handler", () => {
		const toasts = createToasts(manualTimers().schedule);
		let closed = 0;
		const id = toasts.show({ tone: "warn", text: "a", onDismiss: () => closed++ });
		toasts.dismiss(id);
		expect(closed).toBe(1);
	});

	test("closing removes only that toast", () => {
		const toasts = createToasts(manualTimers().schedule);
		const first = toasts.show({ tone: "warn", text: "a" });
		toasts.show({ tone: "warn", text: "b" });
		toasts.dismiss(first);
		expect(live(toasts).map((item) => item.text)).toEqual(["b"]);
	});

	test("closing keeps the toast until its exit has played", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		const id = toasts.show({ tone: "warn", text: "a" });
		toasts.dismiss(id);
		expect(toasts.store.getState().items[0].leaving).toBe(true);
		expect(timers.pending.map((timer) => timer.ms)).toEqual([160]);
		timers.pending[0].run();
		expect(toasts.store.getState().items).toEqual([]);
	});

	test("closing twice runs the close handler once", () => {
		const toasts = createToasts(manualTimers().schedule);
		let closed = 0;
		const id = toasts.show({ tone: "warn", text: "a", onDismiss: () => closed++ });
		toasts.dismiss(id);
		toasts.dismiss(id);
		expect(closed).toBe(1);
	});

	test("a full stack drops the oldest success first", () => {
		const toasts = createToasts(manualTimers().schedule);
		for (const tone of ["danger", "success", "warn", "info"] as const)
			toasts.show({ tone, text: tone });
		expect(live(toasts).map((item) => item.text)).toEqual(["danger", "warn", "info"]);
	});

	test("a full stack drops a non-danger before a danger", () => {
		const toasts = createToasts(manualTimers().schedule);
		for (const tone of ["danger", "warn", "danger", "success"] as const)
			toasts.show({ tone, text: tone });
		expect(live(toasts).map((item) => item.tone)).toEqual(["danger", "danger", "success"]);
	});

	test("the toast just shown is never the one dropped", () => {
		const toasts = createToasts(manualTimers().schedule);
		for (const tone of ["danger", "danger", "danger", "success"] as const)
			toasts.show({ tone, text: tone });
		expect(live(toasts).map((item) => item.tone)).toEqual(["danger", "danger", "success"]);
	});

	test("a toast pushed out does not run its close handler", () => {
		const toasts = createToasts(manualTimers().schedule);
		let closed = 0;
		toasts.show({ tone: "warn", text: "a", onDismiss: () => closed++ });
		for (const text of ["b", "c", "d"]) toasts.show({ tone: "warn", text });
		expect(closed).toBe(0);
	});

	test("a keyed replacement keeps the id, moves to the front and skips the close handler", () => {
		const toasts = createToasts(manualTimers().schedule);
		let closed = 0;
		const id = toasts.show({
			tone: "info",
			text: "a",
			key: "sync",
			onDismiss: () => closed++
		});
		toasts.show({ tone: "warn", text: "b" });
		expect(toasts.show({ tone: "info", text: "c", key: "sync" })).toBe(id);
		expect(live(toasts).map((item) => item.text)).toEqual(["b", "c"]);
		expect(closed).toBe(0);
	});

	test("a keyed replacement does not revive a leaving toast", () => {
		const toasts = createToasts(manualTimers().schedule);
		const id = toasts.show({ tone: "info", text: "a", key: "sync" });
		toasts.dismiss(id);
		expect(toasts.show({ tone: "success", text: "b", key: "sync" })).not.toBe(id);
	});

	test("a keyed replacement to a tone that waits cancels the old timer", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		toasts.show({ tone: "success", text: "a", key: "sync" });
		toasts.show({ tone: "warn", text: "b", key: "sync" });
		expect(timers.pending).toEqual([]);
	});

	test("pausing keeps the remaining time, and resuming continues from it", () => {
		const timers = manualTimers();
		let time = 0;
		const toasts = createToasts(timers.schedule, () => time);
		toasts.show({ tone: "success", text: "a" });
		time = 4_000;
		toasts.pause();
		expect(timers.pending).toEqual([]);
		toasts.resume();
		expect(timers.pending.map((timer) => timer.ms)).toEqual([6_000]);
	});

	test("a toast shown while paused waits for resume", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		toasts.pause();
		toasts.show({ tone: "success", text: "a" });
		expect(timers.pending).toEqual([]);
		toasts.resume();
		expect(timers.pending.map((timer) => timer.ms)).toEqual([10_000]);
	});

	test("resuming without a pause leaves the timer alone", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		toasts.show({ tone: "success", text: "a" });
		toasts.resume();
		expect(timers.pending.map((timer) => timer.ms)).toEqual([10_000]);
	});
});

describe("stackLayout", () => {
	const item = (id: number, leaving = false): ToastItem => ({
		id,
		tone: "info",
		text: "",
		leaving
	});
	const heights = { 1: 60, 2: 80, 3: 40 };

	test("collapsed cards peek above a front card and clamp to its height", () => {
		const { height, cards } = stackLayout([item(1), item(2), item(3)], heights, false);
		expect(height).toBe(56);
		expect(cards[3]).toEqual({ y: 0, scale: 1, clamp: null });
		expect(cards[2]).toEqual({ y: 8, scale: 0.96, clamp: 40 });
		expect(cards[1]).toEqual({ y: 16, scale: 0.92, clamp: 40 });
	});

	test("spread cards sit one above the other with a gap", () => {
		const { height, cards } = stackLayout([item(1), item(2), item(3)], heights, true);
		expect(height).toBe(204);
		expect(cards[3]).toEqual({ y: 0, scale: 1, clamp: null });
		expect(cards[2]).toEqual({ y: 52, scale: 1, clamp: null });
		expect(cards[1]).toEqual({ y: 144, scale: 1, clamp: null });
	});

	test("a leaving card takes no room, and the next card comes to the front", () => {
		const { height, cards } = stackLayout([item(1), item(2), item(3, true)], heights, false);
		expect(height).toBe(88);
		expect(cards[2]).toEqual({ y: 0, scale: 1, clamp: null });
		expect(cards[3].y).toBe(0);
	});

	test("a leaving card does not move when it was behind a live one", () => {
		const { cards } = stackLayout([item(1), item(2, true), item(3)], heights, true);
		expect(cards[2].y).toBe(52);
		expect(cards[1].y).toBe(52);
	});

	test("nothing live takes no room", () => {
		expect(stackLayout([item(1, true)], heights, false).height).toBe(0);
	});
});
