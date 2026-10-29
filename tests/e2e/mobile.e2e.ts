import { expect, type Page, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import type { Bundle } from "../../src/core/content/schema";
import plates from "../../src/data/plates.json";
import { justLearnedLog, learnedLog } from "./support/logs";
import { opened } from "./support/routes";
import { seed } from "./support/seed";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const seen = async (page: Page) =>
	page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));

const tabBar = (page: Page) => page.getByRole("navigation").last();

test("the tab bar reaches every main tab", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	for (const [tab, path] of [
		["Cakupan", /\/cakupan$/],
		["Statistik", /\/statistik$/],
		["Referensi", /\/referensi$/],
		["Beranda", /\/beranda$/]
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
		await opened(page, route);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		expect(overflow, route).toBeLessThanOrEqual(0);
	}
});

test("the top bar and tab bar stay in place while scrolling", async ({ page }) => {
	await seen(page);
	for (const route of ["/beranda", "/setelan"]) {
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
	await page.goto("/beranda");
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
	await page.goto("/beranda");
	await seed(page, learnedLog(["bl", "bk", "bb", "ba", "bm", "bp"]), { logVersion: 1000 });
	await page.goto("/sesi?mode=tantangan");
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

test("the top bar stays in view on a finished session's summary", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await seed(page, learnedLog(["bl", "bk", "bb", "ba", "bm", "bp"]), { logVersion: 1000 });
	await page.goto("/sesi?mode=tantangan");
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
	const exit = page.getByRole("button", { name: "Keluar sesi" });
	await expect(exit).toBeVisible();
	await expect(page.getByText("5/5")).toBeVisible();
	await page.mouse.wheel(0, 400);
	const top = await exit.evaluate((button) => button.getBoundingClientRect().top);
	expect(top).toBeGreaterThanOrEqual(0);
	expect(top).toBeLessThan(40);
});

test("extra practice names the question kind before the area on a phone", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	const ids = (plates as unknown as Bundle).regions.map((region) => region.id);
	await seed(page, justLearnedLog(ids), { logVersion: 1000 });
	await page.goto("/sesi");
	await page.getByRole("button", { name: "Mulai" }).click();
	await page.getByRole("heading", { level: 2 }).waitFor();
	const kind = page
		.getByText(/^Tebak (daerah|kode)$/i)
		.filter({ visible: true })
		.first();
	const area = page.getByText("Seluruh Indonesia", { exact: true }).filter({ visible: true });
	const [kindBox, areaBox] = [await kind.boundingBox(), await area.first().boundingBox()];
	expect(kindBox!.x).toBeLessThan(areaBox!.x);
	expect(Math.abs(kindBox!.y - areaBox!.y)).toBeLessThan(20);
});

test("a tapped map province stays on the map and links to Referensi", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik/peta");
	const path = page.locator("path#jawa-timur");
	// The phone map ignores taps until the data is in.
	await page.getByText("Sumatera", { exact: true }).first().waitFor();
	// A point inside the province's own shape, not just inside its bounding box.
	const point = await path.evaluate((element) => {
		const box = element.getBoundingClientRect();
		for (let y = 0.1; y < 1; y += 0.1)
			for (let x = 0.1; x < 1; x += 0.1) {
				const [px, py] = [box.left + box.width * x, box.top + box.height * y];
				if (document.elementFromPoint(px, py) === element) return { x: px, y: py };
			}
		return null;
	});
	await page.touchscreen.tap(point!.x, point!.y);
	await expect(page).toHaveURL(/\/statistik\/peta$/);
	await expect(page.getByRole("link", { name: "Lihat di Referensi" })).toHaveAttribute(
		"href",
		"/referensi?provinsi=jawa-timur"
	);
});

test("the search box stays under the header while the results scroll", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?cari=timur");
	await page.getByText(/^\d+ kode ditemukan\.$/).waitFor();
	await page.evaluate(() => window.scrollTo(0, 3000));
	const box = (await page.locator("#referensi-search").boundingBox())!;
	expect(box.y).toBeGreaterThanOrEqual(60);
	expect(box.y).toBeLessThan(140);
});

test("opening a code chip in Referensi returns to the top", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	const chip = page.getByRole("button", { name: "Buka PA" });
	await chip.scrollIntoViewIfNeeded();
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	await chip.click();
	await expect(page).toHaveURL(/kode=PA/);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("the top bar's account menu fits the phone and reaches Setelan", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await page.getByRole("button", { name: "Akun" }).click();
	const menu = page.getByRole("menu", { name: "Akun" });
	await expect(menu.getByRole("menuitem")).toHaveText([
		"Setelan",
		"Ekspor data",
		"Impor data",
		"Masuk"
	]);
	const box = (await menu.boundingBox())!;
	const viewport = page.viewportSize()!;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
	await menu.getByRole("menuitem", { name: "Setelan" }).click();
	await expect(page).toHaveURL(/\/setelan$/);
});
