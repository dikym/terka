import { expect, test } from "@playwright/test";
import { pageErrors } from "./support/pwa";

test("pages keep working when the analytics script cannot load", async ({ page, context }) => {
	await context.route("**/_vercel/insights/**", (route) => route.abort());
	await context.route("**/va.vercel-scripts.com/**", (route) => route.abort());
	const errors = pageErrors(page);
	await page.goto("/beranda");
	await expect(page.locator("main")).toBeVisible();
	await page.goto("/statistik");
	await expect(page.locator("main")).toBeVisible();
	expect(errors).toEqual([]);
});
