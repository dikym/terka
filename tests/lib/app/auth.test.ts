import { describe, expect, test } from "bun:test";
import { settleAfterSignIn, settling } from "../../../src/lib/app/auth";

const later = <T>(ms: number, value: T) =>
	new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("settling the screen after sign-in", () => {
	test("reloads only once the first round has finished", async () => {
		const steps: string[] = [];
		await settleAfterSignIn(
			later(20, null).then(() => void steps.push("synced")),
			async () => void steps.push("reloaded")
		);
		expect(steps).toEqual(["synced", "reloaded"]);
	});

	test("stops waiting for a round that takes too long and still reloads", async () => {
		const steps: string[] = [];
		const started = Date.now();
		await settleAfterSignIn(later(5_000, null), async () => void steps.push("reloaded"), 30);
		expect(steps).toEqual(["reloaded"]);
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	test("reloads when the round fails", async () => {
		const steps: string[] = [];
		await settleAfterSignIn(Promise.reject(new Error("offline")), async () => {
			steps.push("reloaded");
		});
		expect(steps).toEqual(["reloaded"]);
	});

	test("holds the screens back from the first round until the reload is done", async () => {
		const seen: boolean[] = [];
		const done = settleAfterSignIn(later(20, null), async () => void seen.push(settling.get()));
		expect(settling.get()).toBe(true);
		await done;
		expect(seen).toEqual([true]);
		expect(settling.get()).toBe(false);
	});

	test("lets the screens through again when the reload itself fails", async () => {
		const done = settleAfterSignIn(Promise.resolve(), async () => {
			throw new Error("storage failed");
		});
		await expect(done).rejects.toThrow("storage failed");
		expect(settling.get()).toBe(false);
	});
});
