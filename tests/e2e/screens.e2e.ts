import { expect, type Page, test } from "@playwright/test";
import { pageErrors } from "./support/pwa";

test.skip(({ browserName }) => browserName !== "chromium", "desktop screens");
test.use({ viewport: { width: 1280, height: 900 } });

const seen = async (page: Page) =>
	page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));

const search = (page: Page, query: string) => page.locator("#referensi-search").fill(query);

test("first visit shows the welcome screen", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("dialog", { name: "Terka" })).toBeVisible();
	await page.getByRole("button", { name: "Lewati, mulai dari awal" }).click();
	await expect(page.getByText("soal perlu diulang")).toBeVisible();
});

test("home shows a skeleton before data", async ({ page }) => {
	await seen(page);
	await page.goto("/", { waitUntil: "commit" });
	await expect(page.locator("[data-skeleton]").first()).toBeVisible();
	await expect(page.getByText("soal perlu diulang")).toBeVisible();
});

test("reference search reaches every result kind", async ({ page }) => {
	const errors = pageErrors(page);
	await seen(page);
	await page.goto("/referensi");
	await search(page, "BK");
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
	await search(page, "CD 49 07");
	await expect(
		page.getByText("Dibaca sebagai kode diplomat CD 49.", { exact: false })
	).toBeVisible();
	await search(page, "CC 12 10");
	await expect(page.getByText("Korps konsulat").first()).toBeVisible();
	await search(page, "RI 1");
	await expect(page.getByText("Pejabat negara").first()).toBeVisible();
	await search(page, "qwrty");
	await expect(page.getByText("Tidak ada hasil untuk “qwrty”.")).toBeVisible();
	await search(page, "CD 4");
	await expect(page.getByText("Lihat 6 hasil lainnya")).toBeVisible();
	expect(errors).toEqual([]);
});

test("mode param picks the preview", async ({ page }) => {
	await seen(page);
	const titles: [string, string][] = [
		["/sesi", "Sesi hari ini"],
		["/sesi?mode=harian", "Tantangan Harian"],
		["/sesi?mode=kilat", "Mode Kilat"],
		["/sesi?mode=terfokus", "Latihan Terfokus"],
		["/sesi?mode=diplomat", "Kode diplomat"]
	];
	for (const [path, title] of titles) {
		await page.goto(path);
		await expect(page.getByRole("heading", { name: title })).toBeVisible();
	}
});

test("a session runs to its summary from the keyboard", async ({ page }) => {
	await seen(page);
	await page.goto("/sesi?mode=harian");
	await page.getByRole("heading", { name: "Tantangan Harian" }).waitFor();
	await page.keyboard.press("Enter");
	for (const answer of ["Kalsel", "Jogja", "B", null, "Bali"]) {
		await page.getByRole("heading", { level: 2 }).waitFor();
		if (answer) await page.keyboard.type(answer);
		await page.keyboard.press(answer ? "Enter" : "j");
		await page.keyboard.press("Enter");
	}
	await expect(page.getByRole("heading", { name: "Tantangan hari ini selesai" })).toBeVisible();
});

test("undo restores the question", async ({ page }) => {
	await seen(page);
	await page.goto("/sesi?mode=terfokus");
	await page.getByRole("heading", { name: "Latihan Terfokus" }).waitFor();
	await page.keyboard.press("Enter");
	await page.getByRole("heading", { name: "DE dipakai daerah mana?" }).waitFor();
	await page.keyboard.type("Jambi");
	await page.keyboard.press("Enter");
	await expect(page.getByText("Belum tepat")).toBeVisible();
	await page.keyboard.press("z");
	await expect(page.getByText("Jawaban dibatalkan")).toBeVisible();
	await expect(page.locator("#jawaban")).toHaveValue("");
});

test("statistics links reach their screens", async ({ page }) => {
	await seen(page);
	for (const [link, title] of [
		["Buka Peta Penguasaan", "Peta Penguasaan"],
		["Tinjau kode", "Sulit Dikuasai"],
		["Kelola akun", "Akun dan sinkronisasi"]
	]) {
		await page.goto("/statistik");
		await page.getByText(link).click();
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
	}
});

test("coverage selection changes the side panel", async ({ page }) => {
	await seen(page);
	await page.goto("/cakupan");
	await page.getByRole("button", { name: "Sumatera" }).first().click();
	await expect(page.getByRole("heading", { name: "Kawasan Sumatera" })).toBeVisible();
	await page.getByRole("button", { name: "Seluruh Indonesia" }).first().click();
	await expect(page.getByText("34 materi baru tersedia")).toBeVisible();
});

test("shortcuts overlay opens and closes", async ({ page }) => {
	await seen(page);
	await page.goto("/");
	await page.getByRole("button", { name: "Papan tombol" }).click();
	await expect(page.getByRole("dialog", { name: "Papan tombol" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Papan tombol" })).toBeHidden();
});

test("every text uses a design font", async ({ page }) => {
	await seen(page);
	await page.goto("/");
	await page.getByText("soal perlu diulang").waitFor();
	const loaded = await page.evaluate(async () => {
		await document.fonts.ready;
		return [...document.fonts]
			.filter((face) => face.status === "loaded")
			.map((face) => face.family);
	});
	for (const family of [
		"Space Grotesk",
		"IBM Plex Sans",
		"IBM Plex Mono",
		"Barlow Semi Condensed"
	])
		expect(loaded.some((name) => name.includes(family))).toBe(true);
});

test("a naming round can be finished with the mouse", async ({ page }) => {
	await seen(page);
	await page.goto("/sesi?mode=sebutkan&code=BK");
	await page.getByRole("button", { name: "Mulai" }).click();
	await page.locator("#jawaban").fill("Medan");
	await page.getByRole("button", { name: "Tambah" }).click();
	await page.getByRole("button", { name: "Selesai" }).click();
	await page.getByRole("button", { name: "Lanjut" }).click();
	await expect(page.getByRole("heading", { name: "Sesi selesai" })).toBeVisible();
});

test("slash from another page opens Referensi with the search focused", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	await page.getByRole("heading", { name: "Statistik" }).waitFor();
	await page.keyboard.press("/");
	await expect(page.locator("#referensi-search")).toBeFocused();
});

test("keyboard focus stays inside the welcome screen", async ({ page }) => {
	await page.goto("/");
	const dialog = page.getByRole("dialog", { name: "Terka" });
	await dialog.waitFor();
	for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
	expect(await dialog.evaluate((root) => root.contains(document.activeElement))).toBe(true);
	await page.keyboard.press("s");
	await expect(page).toHaveURL(/\/$/);
});

test("the wheel zooms the map without scrolling the page", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	const map = page.getByRole("img", { name: "Peta Penguasaan per provinsi" });
	await map.scrollIntoViewIfNeeded();
	const before = await page.evaluate(() => window.scrollY);
	await map.hover();
	await page.mouse.wheel(0, -200);
	await expect(page.getByText(/^1\d\d%$/).first()).toBeVisible();
	expect(await page.evaluate(() => window.scrollY)).toBe(before);
});
