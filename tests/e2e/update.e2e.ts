import { expect, test } from "@playwright/test";
import { installed } from "./support/pwa";

// While Playwright records a trace, a takeover without a reload sometimes never completes.
test.use({ trace: "off" });

test.afterEach(async ({ request }) => {
	await request.get("/__sw-version?v=1");
});

test("a new version waits while the page runs and takes over on the next load", async ({
	page,
	request
}) => {
	await request.get("/__sw-version?v=1");
	await installed(page);
	await page.goto("/sesi");
	await page.evaluate(() => {
		(window as unknown as { switched: number }).switched = 0;
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			(window as unknown as { switched: number }).switched++;
		});
	});
	await request.get("/__sw-version?v=2");
	await page.evaluate(async () => {
		await (await navigator.serviceWorker.getRegistration())!.update();
	});
	await page.waitForFunction(
		async () => (await navigator.serviceWorker.getRegistration())?.waiting != null
	);
	expect(await page.evaluate(() => fetch("/plates.json").then((response) => response.ok))).toBe(
		true
	);
	expect(await page.evaluate(() => (window as unknown as { switched: number }).switched)).toBe(0);
	await expect(page.getByText(/Versi baru tersedia/)).toHaveCount(0);

	await page.reload();
	await page.waitForFunction(async () => {
		const registration = await navigator.serviceWorker.getRegistration();
		return (
			registration?.waiting == null &&
			registration?.active?.state === "activated" &&
			navigator.serviceWorker.controller !== null
		);
	});
	await expect(page.locator("main")).toBeVisible();
});

test("a new version installs itself when the app comes back to the screen outside a session", async ({
	page,
	request
}) => {
	await request.get("/__sw-version?v=1");
	await installed(page);
	await page.evaluate(() => {
		(window as unknown as { marker: number }).marker = 1;
	});
	await request.get("/__sw-version?v=2");
	await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
	await page.waitForFunction(() => !("marker" in window));
	await page.waitForFunction(async () => {
		const registration = await navigator.serviceWorker.getRegistration();
		return registration?.waiting == null && navigator.serviceWorker.controller !== null;
	});
	await expect(page.locator("main")).toBeVisible();
});

test("a new version found during a session waits quietly and installs once the session is left", async ({
	page,
	request
}) => {
	await page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));
	await request.get("/__sw-version?v=1");
	await installed(page);
	await page.getByRole("link", { name: "Mulai belajar" }).first().click();
	await expect(page).toHaveURL(/\/sesi/);
	await page.evaluate(() => {
		(window as unknown as { marker: number }).marker = 1;
	});
	await request.get("/__sw-version?v=2");
	await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
	await page.waitForFunction(
		async () => (await navigator.serviceWorker.getRegistration())?.waiting != null
	);
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => "marker" in window)).toBe(true);
	await expect(page.getByText(/Versi baru/)).toHaveCount(0);
	await page.keyboard.press("Escape");
	await page.waitForFunction(() => !("marker" in window));
	await expect(page.locator("main")).toBeVisible();
});
