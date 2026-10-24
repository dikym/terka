import { expect, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import { pageErrors } from "./support/pwa";

for (const route of MAIN_ROUTES)
	test(`${route} is its own page`, async ({ page }) => {
		const errors = pageErrors(page);
		const response = await page.goto(route);
		expect(response?.status()).toBe(200);
		await expect(page.locator("main")).toBeVisible();
		expect(errors).toEqual([]);
	});
