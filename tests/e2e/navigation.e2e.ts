import { expect, test } from "@playwright/test";
import { learnedLog } from "./support/logs";
import { installed } from "./support/pwa";
import { seed } from "./support/seed";

test.skip(({ browserName }) => browserName !== "chromium", "desktop screens");

test("the daily session opens its own preview after a Mode Kilat preview was left", async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));
	await installed(page);
	await seed(page, learnedLog(["bl", "bk", "bb"], []), { logVersion: 1000 });
	await page.goto("/beranda");
	await page.getByRole("link", { name: "Mode Kilat" }).first().click();
	await page.getByRole("heading", { name: "Mode Kilat" }).waitFor();
	await page.goBack();
	await page.getByRole("link", { name: "Mulai belajar" }).first().click();
	await expect(page).toHaveURL(/\/sesi\?mode=harian$/);
	await expect(page.getByRole("heading", { name: "Mode Kilat" })).toHaveCount(0);
});
