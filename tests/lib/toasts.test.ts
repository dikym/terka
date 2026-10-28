import { describe, expect, test } from "bun:test";
import { createToasts } from "../../src/lib/toasts";

// Collects scheduled callbacks so a test can run them when it wants.
function manualTimers() {
	const pending: { run: () => void; ms: number }[] = [];
	return {
		schedule: (run: () => void, ms: number) => void pending.push({ run, ms }),
		pending
	};
}

describe("toasts", () => {
	test("at most three show, the newest last", () => {
		const toasts = createToasts(manualTimers().schedule);
		for (const text of ["a", "b", "c", "d"]) toasts.show({ tone: "warn", text });
		expect(toasts.store.getState().items.map((item) => item.text)).toEqual(["b", "c", "d"]);
	});

	test("success hides by itself after ten seconds, other tones stay", () => {
		const timers = manualTimers();
		const toasts = createToasts(timers.schedule);
		toasts.show({ tone: "success", text: "Data diekspor" });
		toasts.show({ tone: "info", text: "Sedang offline." });
		toasts.show({ tone: "danger", text: "Perubahan belum tersimpan. Coba lagi." });
		expect(timers.pending.map((timer) => timer.ms)).toEqual([10_000]);
		timers.pending[0].run();
		expect(toasts.store.getState().items.map((item) => item.tone)).toEqual(["info", "danger"]);
	});

	test("a toast with the same key replaces the earlier one", () => {
		const toasts = createToasts(manualTimers().schedule);
		toasts.show({ tone: "info", text: "Sedang offline.", key: "sync" });
		toasts.show({ tone: "info", text: "Tersinkron", key: "sync" });
		expect(toasts.store.getState().items.map((item) => item.text)).toEqual(["Tersinkron"]);
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
		expect(toasts.store.getState().items.map((item) => item.text)).toEqual(["b"]);
	});
});
