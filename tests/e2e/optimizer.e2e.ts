import { expect, test } from "@playwright/test";
import type { Bundle } from "../../src/core/content/schema";
import plates from "../../src/data/plates.json";
import { asUuid } from "../lib/db/fixtures";
import { eligibleLog, replayLog } from "./support/logs";
import { rows, seed } from "./support/seed";

const bundle = plates as unknown as Bundle;
const device = { deviceId: asUuid("device-e2e") };

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		const tasks: number[] = [];
		(window as unknown as { longTasks: number[] }).longTasks = tasks;
		try {
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) tasks.push(entry.duration);
			}).observe({ type: "longtask", buffered: true });
		} catch {
			// WebKit has no long task timing.
		}
	});
});

test("an eligible log gets optimized in a worker without blocking the page", async ({ page }) => {
	await page.goto("/");
	await seed(page, eligibleLog(bundle), device);
	await page.reload();
	await expect
		.poll(async () => (await rows(page, "fsrs_params")).length, { timeout: 90_000 })
		.toBe(1);
	const [row] = (await rows(page, "fsrs_params")) as { status: string; weights: number[] }[];
	expect(["active", "rejected"]).toContain(row.status);
	expect(row.weights).toHaveLength(21);
	const flags = (await rows(page, "ui_flags")) as { key: string }[];
	expect(flags.map((flag) => flag.key)).toContain("diagnostics.steps");
	const longest = Math.max(
		0,
		...(await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks))
	);
	expect(longest).toBeLessThan(200);
});

test("the session screen never starts an optimization", async ({ page }) => {
	await page.goto("/");
	await seed(page, eligibleLog(bundle), device);
	await page.goto("/sesi");
	await page.waitForTimeout(10_000);
	expect(await rows(page, "fsrs_params")).toEqual([]);
});

test("a full replay of 20,000 events stays under 2 seconds at 4x CPU slowdown", async ({
	page,
	browserName
}) => {
	test.skip(browserName !== "chromium", "CPU throttling needs the Chrome DevTools Protocol");
	const events = [...eligibleLog(bundle), ...replayLog()].slice(0, 20_000);
	expect(events.length).toBe(20_000);
	await page.goto("/");
	// The first visit caches its empty state; a newer log version makes the reload replay.
	await seed(page, events, { ...device, logVersion: 1000 });
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
	await page.reload();
	await expect
		.poll(async () => (await rows(page, "fsrs_params")).length, { timeout: 110_000 })
		.toBe(1);
	const replay = await page.evaluate(
		() => performance.getEntriesByName("terka:replay")[0]?.duration ?? null
	);
	expect(replay).not.toBeNull();
	expect(replay!).toBeLessThan(2_000);
});
