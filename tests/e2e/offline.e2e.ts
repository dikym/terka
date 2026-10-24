import { expect, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import { installed } from "./support/pwa";

test("every main route opens offline on the second visit", async ({ page, context }) => {
	await installed(page);
	await context.setOffline(true);
	for (const route of [...MAIN_ROUTES, "/auth/callback?code=abc"]) {
		await page.goto(route);
		await expect(page.locator("main")).toBeVisible();
	}
	const assets = await page.evaluate(() =>
		Promise.all(
			["/plates.json", "/map.svg", "/optimizer/fsrs.wasm"].map((url) =>
				fetch(url).then((response) => response.ok)
			)
		)
	);
	expect(assets).toEqual([true, true, true]);
});

test("a failed first install explains that it needs a connection", async ({ page, context }) => {
	await context.route("**/optimizer/fsrs.wasm", (route) => route.abort());
	await page.goto("/");
	await page.waitForFunction(async () => {
		const registration = await navigator.serviceWorker.getRegistration();
		return registration !== undefined && !registration.installing && !registration.active;
	});
	await context.setOffline(true);
	await expect(
		page.getByText("Pemasangan pertama memerlukan koneksi internet. Coba lagi saat online.")
	).toBeVisible();
});

test("the install message stays hidden while online", async ({ page, context }) => {
	await context.route("**/optimizer/fsrs.wasm", (route) => route.abort());
	await page.goto("/");
	await page.waitForTimeout(2_000);
	await expect(page.getByRole("status")).toHaveCount(0);
});
