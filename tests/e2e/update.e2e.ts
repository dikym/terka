import { expect, test } from "@playwright/test";
import { installed } from "./support/pwa";

test.afterEach(async ({ request }) => {
	await request.get("/__sw-version?v=1");
});

test("a new version waits while the page runs and takes over on the next load", async ({
	page,
	request
}) => {
	await request.get("/__sw-version?v=1");
	await installed(page);
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
