import { expect, type Page, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import { learnedLog } from "./support/logs";
import { seed } from "./support/seed";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const seen = async (page: Page) =>
	page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));

const tabBar = (page: Page) => page.getByRole("navigation").last();

test("the tab bar reaches every main tab", async ({ page }) => {
	await seen(page);
	await page.goto("/");
	for (const [tab, path] of [
		["Cakupan", /\/cakupan$/],
		["Statistik", /\/statistik$/],
		["Referensi", /\/referensi$/],
		["Beranda", /\/$/]
	] as const) {
		await tabBar(page).getByRole("link", { name: tab }).click();
		await expect(page).toHaveURL(path);
		await expect(tabBar(page).getByRole("link", { name: tab })).toHaveAttribute(
			"aria-current",
			"page"
		);
	}
});

test("no screen scrolls sideways at phone width", async ({ page }) => {
	await seen(page);
	for (const route of MAIN_ROUTES) {
		await page.goto(route);
		await page.locator("main").waitFor();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		expect(overflow, route).toBeLessThanOrEqual(0);
	}
});

test("the top bar and tab bar stay in place while scrolling", async ({ page }) => {
	await seen(page);
	for (const route of ["/", "/setelan"]) {
		await page.goto(route);
		await page.getByRole("link", { name: "Statistik" }).last().waitFor();
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		const edges = await page.evaluate(() => {
			const top = document.querySelector("[data-topbar]") ?? document.querySelector("header");
			const nav = [...document.querySelectorAll("nav")].at(-1);
			return {
				top: top?.getBoundingClientRect().top,
				bottom: nav?.getBoundingClientRect().bottom,
				height: window.innerHeight
			};
		});
		expect(edges.top, route).toBe(0);
		expect(Math.round(edges.bottom ?? 0), route).toBe(edges.height);
	}
});

test("keyboard hints stay hidden on a phone", async ({ page }) => {
	await seen(page);
	await page.goto("/");
	await page.getByText("soal perlu diulang").waitFor();
	for (const hint of await page.locator("kbd").all()) await expect(hint).toBeHidden();
});

test("tapping a province shows its details under the map", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik/peta");
	const map = page.getByRole("img", { name: "Peta Penguasaan per provinsi" });
	await expect(map.locator("path#bali")).toBeAttached();
	// Taps count once the learning data is in; the rows under the map show that it is.
	await page.getByText("Bali & Nusa Tenggara").first().waitFor();
	// Selection follows the pointer, so the test taps instead of dispatching a click.
	await map.locator("path#bali").tap({ force: true });
	await expect(
		page.locator("[aria-live=polite]").getByText("Bali", { exact: true })
	).toBeVisible();
});

test("a finished session keeps its way home in the bottom bar", async ({ page }) => {
	await seen(page);
	await page.goto("/");
	await seed(page, learnedLog(["bl", "bk", "bb", "ba", "bm", "bp"]), { logVersion: 1000 });
	await page.goto("/sesi?mode=harian");
	await page.getByRole("button", { name: "Mulai tantangan" }).click();
	for (let i = 0; i < 5; i++) {
		await page.getByRole("heading", { level: 2 }).waitFor();
		const input = page.locator("#jawaban");
		if (await input.count()) {
			await input.fill("x");
			await page.getByRole("button", { name: "Periksa" }).click();
		} else await page.locator("main button:not([disabled])").first().click();
		await page.getByRole("button", { name: "Lanjut" }).click();
	}
	// The desktop copy of the link is hidden, so only the bottom bar's one counts.
	const home = page.getByRole("link", { name: "Kembali ke beranda" });
	await expect(home).toHaveCount(1);
	const bottom = await home.evaluate((link) => link.getBoundingClientRect().bottom);
	expect(bottom).toBeGreaterThan(page.viewportSize()!.height - 40);
});
