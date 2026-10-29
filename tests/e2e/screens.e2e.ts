import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Bundle } from "../../src/core/content/schema";
import plates from "../../src/data/plates.json";
import { DAY } from "../core/replay/fixtures";
import { justLearnedLog, learnedLog, missedLog } from "./support/logs";
import { pageErrors } from "./support/pwa";
import { rows, seed } from "./support/seed";

test.skip(({ browserName }) => browserName !== "chromium", "desktop screens");
test.use({ viewport: { width: 1280, height: 900 } });

const seen = async (page: Page) =>
	page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));

const accountMenu = async (page: Page) => {
	await page.getByRole("button", { name: "Akun" }).click();
	return page.getByRole("menu", { name: "Akun" });
};

const search = (page: Page, query: string) => page.locator("#referensi-search").fill(query);

// Ten Sumatera codes learned over the past two months; BK also has its Sebutkan card open.
const LEARNED = ["bl", "bk", "bb", "ba", "bm", "bp", "bh", "bg", "bn", "be"];
async function withLearned(page: Page) {
	await page.goto("/beranda");
	await seed(page, learnedLog(LEARNED, ["bk"]), { logVersion: 1000 });
}

// Answers whatever is asked: a typed question gets a guess, a choice the first option.
async function answerOne(page: Page) {
	await page.getByRole("heading", { level: 2 }).waitFor();
	const input = page.locator("#jawaban");
	if (await input.count()) {
		await input.fill("x");
		await page.keyboard.press("Enter");
	} else await page.keyboard.press("f");
}

test("first visit shows the welcome screen", async ({ page }) => {
	await page.goto("/beranda");
	await expect(page.getByRole("dialog", { name: "Terka" })).toBeVisible();
	await page.getByRole("button", { name: "Lewati, mulai dari awal" }).click();
	await expect(page.getByText("soal perlu diulang")).toBeVisible();
});

test("the landing page starts with the placement test, through one button", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("link", { name: "Ikut tes penempatan" })).toHaveCount(0);
	await page.getByRole("link", { name: "Mulai belajar" }).first().click();
	const welcome = page.getByRole("dialog", { name: "Terka" });
	await expect(welcome).toBeVisible();
	await expect(welcome.getByText("Tes penempatan", { exact: true })).toBeVisible();
});

test("a returning visitor opening the landing page goes straight to the home screen", async ({
	page
}) => {
	await seen(page);
	await page.goto("/");
	await expect(page).toHaveURL(/\/beranda$/);
});

test("a returning visitor can still open a landing section through its link", async ({ page }) => {
	await seen(page);
	await page.goto("/#data");
	await expect(page).toHaveURL(/\/#data$/);
	await expect(
		page.getByRole("heading", { name: /Progres tersimpan di perangkatmu/ })
	).toBeVisible();
});

test("the landing demo plays three questions without resizing and can start again", async ({
	page
}) => {
	await page.goto("/");
	const card = page.locator("div.shadow-block", { hasText: "Coba tebak daerah" });
	await expect(card.getByText("1/3")).toBeVisible();
	const height = async () => (await card.boundingBox())!.height;
	const start = await height();
	for (const step of [1, 2, 3]) {
		await expect(card.getByText(`${step}/3`)).toBeVisible();
		await page.keyboard.press("Tab");
		await card.getByRole("button").first().press("f");
		await expect(card.getByText(/^(Benar\.|Belum tepat, ini .+\.)$/)).toBeVisible();
		expect(await height()).toBe(start);
		await card
			.getByRole("button", { name: step === 3 ? "Lihat hasil" : "Soal berikutnya" })
			.click();
	}
	await expect(card.getByText(/^\d dari 3 benar\.$/)).toBeVisible();
	expect(await height()).toBe(start);
	await expect(card.getByRole("link", { name: "Mulai belajar" })).toHaveCount(0);
	await card.getByRole("button", { name: "Coba kode lain" }).click();
	await expect(card.getByText("1/3")).toBeVisible();
});

test("starting the placement test goes straight to it without showing the home screen", async ({
	page
}) => {
	await page.goto("/beranda");
	await expect(page.getByRole("dialog", { name: "Terka" })).toBeVisible();
	await page.evaluate(() => {
		const seen = window as unknown as { homeFlash: boolean };
		seen.homeFlash = false;
		new MutationObserver(() => {
			if (location.pathname === "/beranda" && !document.querySelector('[role="dialog"]'))
				seen.homeFlash = true;
		}).observe(document.body, { childList: true, subtree: true });
	});
	await page.getByRole("button", { name: "Mulai tes" }).click();
	await expect(page).toHaveURL(/mode=penempatan/);
	expect(await page.evaluate(() => (window as unknown as { homeFlash: boolean }).homeFlash)).toBe(
		false
	);
});

test("a first visit paints the welcome skeleton, never the home skeleton", async ({ page }) => {
	await page.addInitScript(() => {
		document.addEventListener("DOMContentLoaded", () => {
			const skeleton = document.querySelector("[data-welcome-skeleton]");
			(window as unknown as { firstPaint: string }).firstPaint = skeleton
				? getComputedStyle(skeleton).display
				: "missing";
		});
	});
	await page.goto("/beranda");
	await expect(page.getByRole("dialog", { name: "Terka" })).toBeVisible();
	expect(
		await page.evaluate(() => (window as unknown as { firstPaint: string }).firstPaint)
	).toBe("flex");
	await expect(page.locator("[data-welcome-skeleton]")).toBeHidden();
});

test("the welcome skeleton stays up however long the scripts take", async ({ page }) => {
	await page.route(/\.js(\?|$)/, async (route) => {
		await new Promise((done) => setTimeout(done, 4500));
		await route.continue();
	});
	await page.goto("/beranda", { waitUntil: "commit" });
	await page.waitForTimeout(4000);
	await expect(page.locator("[data-welcome-skeleton]")).toBeVisible();
	await expect(page.getByRole("dialog", { name: "Terka" })).toBeVisible({ timeout: 15_000 });
	await expect(page.locator("[data-welcome-skeleton]")).toBeHidden();
});

test("a returning visit never shows the welcome skeleton", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda", { waitUntil: "commit" });
	await page.waitForLoadState("domcontentloaded");
	await expect(page.locator("[data-welcome-skeleton]")).toBeHidden();
});

test("home shows a skeleton before data", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda", { waitUntil: "commit" });
	await expect(page.locator("[data-skeleton]").filter({ visible: true }).first()).toBeVisible();
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
	await expect(page.getByRole("option", { name: /CD 49/ })).toBeVisible();
	await page.getByRole("option", { name: /CD 49/ }).click();
	await page.getByRole("button", { name: /CD 50/ }).click();
	await expect(page.getByText("Bulgaria").first()).toBeVisible();
	expect(errors).toEqual([]);
});

test("mode param picks the preview", async ({ page }) => {
	await seen(page);
	const titles: [string, string][] = [
		["/sesi", "Sesi hari ini"],
		["/sesi?mode=tantangan", "Tantangan Harian"],
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
	await withLearned(page);
	await page.goto("/sesi?mode=tantangan");
	await page.getByRole("heading", { name: "Tantangan Harian" }).waitFor();
	await page.keyboard.press("Enter");
	for (let i = 0; i < 5; i++) {
		await answerOne(page);
		await page.getByRole("button", { name: "Lanjut" }).waitFor();
		await page.keyboard.press("Enter");
	}
	await expect(page.getByRole("heading", { name: "Tantangan hari ini selesai" })).toBeVisible();
	await page.goto("/beranda");
	const challenge = page.getByRole("button", { name: "Tantangan Harian" });
	await expect(challenge).toBeDisabled();
	const shown = await challenge.textContent();
	await expect(challenge).not.toHaveText(shown ?? "");
});

test("a Mode Kilat answer moves on without a next button", async ({ page }) => {
	await seen(page);
	await withLearned(page);
	await page.goto("/sesi?mode=kilat");
	await page.getByRole("heading", { name: "Mode Kilat" }).waitFor();
	await page.keyboard.press("Enter");
	const first = await page.getByRole("heading", { level: 2 }).textContent();
	await answerOne(page);
	expect(await page.getByRole("button", { name: "Lanjut" }).count()).toBe(0);
	await expect(page.getByRole("heading", { level: 2 })).not.toHaveText(first ?? "");
});

test("a new learner's practice modes explain that nothing is learned yet", async ({ page }) => {
	await seen(page);
	await page.goto("/sesi?mode=kilat");
	await expect(
		page.getByText("Belum ada materi yang bisa dilatih di wilayah ini.")
	).toBeVisible();
});

test("the daily session introduces new codes and moves them out of new material", async ({
	page
}) => {
	await seen(page);
	await page.goto("/sesi");
	await page.getByRole("heading", { name: "Sesi hari ini" }).waitFor();
	await page.keyboard.press("Enter");
	await page.getByRole("heading", { level: 2 }).waitFor();
	await page.keyboard.press("f");
	await expect(page.getByText("Tebakan tidak dinilai.")).toBeVisible();
	await page.keyboard.press("Enter");
	// The answer is written in the background; leave only once it is stored.
	await expect.poll(async () => (await rows(page, "review_logs")).length).toBe(1);
	await page.goto("/beranda");
	await expect(page.getByText(/^9 kode baru hari ini$/)).toBeVisible();
});

test("the browser back button asks before leaving a session that has answers", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await page.goto("/sesi");
	await page.getByRole("heading", { name: "Sesi hari ini" }).waitFor();
	await page.keyboard.press("Enter");
	await answerOne(page);
	await expect.poll(async () => (await rows(page, "review_logs")).length).toBe(1);

	await page.goBack();
	const dialog = page.getByRole("alertdialog", { name: "Keluar dari sesi?" });
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/\/sesi/);

	await dialog.getByRole("button", { name: "Lanjut sesi" }).click();
	await expect(dialog).toHaveCount(0);
	await page.goBack();
	await expect(dialog).toBeVisible();

	await dialog.getByRole("button", { name: "Keluar" }).click();
	await expect(page).toHaveURL(/\/beranda/);
});

test("the browser back button leaves a session without answers at once", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await page.goto("/sesi");
	await page.getByRole("heading", { name: "Sesi hari ini" }).waitFor();
	await page.keyboard.press("Enter");
	await page.getByRole("heading", { level: 2 }).waitFor();
	await page.goBack();
	await expect(page).toHaveURL(/\/beranda/);
});

test("a new code is asked once more before the session ends and nothing is due afterwards", async ({
	page
}) => {
	await seen(page);
	await page.goto("/sesi");
	await page.getByRole("heading", { name: "Sesi hari ini" }).waitFor();
	await page.keyboard.press("Enter");
	const done = page.getByRole("heading", { name: "Sesi selesai" });
	let answered = 0;
	while (!(await done.isVisible()) && answered < 40) {
		await answerOne(page);
		answered++;
		const next = page.getByRole("button", { name: "Lanjut" });
		await next.waitFor();
		await page.keyboard.press("Enter");
		await page.waitForTimeout(50);
	}
	await expect(done).toBeVisible();
	const logs = await rows(page, "review_logs");
	const asked = new Set(logs.map((row) => (row as { contentId: string }).contentId));
	expect(logs.length).toBe(asked.size * 2);
	await expect(page.getByText("Jadwal hari ini", { exact: true })).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/beranda/);
	await expect(page.getByText("Sesi hari ini selesai")).toBeVisible();
});

test("with everything learned and nothing due, home is not finished and the daily session offers extra practice", async ({
	page
}) => {
	await seen(page);
	await page.goto("/beranda");
	const ids = (plates as unknown as Bundle).regions.map((region) => region.id);
	await seed(page, justLearnedLog(ids), { logVersion: 1000 });
	await page.goto("/beranda");
	await expect(page.getByText("Belum ada soal terjadwal hari ini")).toBeVisible();
	await expect(page.getByText("Sesi hari ini selesai")).toHaveCount(0);
	await page.getByRole("link", { name: "Mulai belajar" }).first().click();
	await expect(page.getByRole("heading", { name: "Latihan Terfokus" })).toBeVisible();
	await expect(page.getByText(/Semua soal terjadwal hari ini sudah selesai/)).toBeVisible();
	await page.keyboard.press("Enter");
	await answerOne(page);
	await page.getByRole("button", { name: "Lanjut" }).waitFor();
});

test("extra practice names the question kind before the area", async ({ page }) => {
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

test("after a long break Mulai belajar opens Cek ingatan and Lewati opens the daily session", async ({
	page
}) => {
	await seen(page);
	await page.goto("/beranda");
	const ids = (plates as unknown as Bundle).regions
		.filter((region) => region.areas.every((area) => area.confidence === "high"))
		.slice(0, 40)
		.map((region) => region.id);
	// Learned long ago, last practised 270 days back: everything is due and the user has been away.
	await seed(page, learnedLog(ids, [], Date.now() - 300 * DAY), { logVersion: 1000 });
	await page.goto("/beranda");
	await page.getByRole("link", { name: "Mulai belajar" }).first().waitFor();
	await page.keyboard.press("s");
	await expect(page.getByRole("heading", { name: "Cek ingatan" })).toBeVisible();
	await page.goto("/beranda");
	await page.getByRole("link", { name: "Mulai belajar" }).first().click();
	await expect(page.getByRole("heading", { name: "Cek ingatan" })).toBeVisible();
	await expect(page.getByText(/seberapa banyak yang masih kamu ingat/)).toBeVisible();
	await page.getByRole("link", { name: "Lewati, mulai sesi biasa" }).click();
	await expect(page).toHaveURL(/\/sesi\?mode=harian$/);
	await expect(page.getByRole("heading", { name: "Sesi hari ini" })).toBeVisible();
});

test("the progress total holds steady when an introduction is answered and undone", async ({
	page
}) => {
	await seen(page);
	await page.goto("/sesi");
	await page.getByRole("heading", { name: "Sesi hari ini" }).waitFor();
	await page.keyboard.press("Enter");
	const count = page.getByText(/^\d+\/\d+$/).first();
	await page.getByRole("heading", { level: 2 }).waitFor();
	const shown = (await count.textContent())!;
	await page.keyboard.press("f");
	await expect.poll(async () => (await rows(page, "review_logs")).length).toBe(1);
	await expect(count).toHaveText(shown);
	await page.keyboard.press("z");
	await expect(count).toHaveText(shown);
	await page.keyboard.press("f");
	await page.keyboard.press("Enter");
	await page.getByRole("heading", { level: 2 }).waitFor();
	const [, total] = shown.split("/");
	await expect(count).toHaveText(`2/${total}`);
});

test("undo restores the question", async ({ page }) => {
	await seen(page);
	await withLearned(page);
	await page.goto("/sesi?mode=terfokus");
	await page.getByRole("heading", { name: "Latihan Terfokus" }).waitFor();
	await page.keyboard.press("Enter");
	await answerOne(page);
	await page.getByRole("button", { name: "Lanjut" }).waitFor();
	await page.keyboard.press("z");
	await expect(page.getByText("Jawaban dibatalkan")).toBeVisible();
	if (await page.locator("#jawaban").count())
		await expect(page.locator("#jawaban")).toHaveValue("");
});

test("statistics leave out cards that have nothing to show yet", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	await page.getByText("Perkiraan beban 14 hari").waitFor();
	for (const label of [
		"Kode terlemah",
		"Sulit Dikuasai",
		"Sebutkan sebanyak mungkin",
		"Kode Khusus",
		"Pelat Terlihat"
	])
		await expect(page.getByText(label, { exact: true })).toHaveCount(0);
	await page.goto("/referensi");
	await page.getByText("Semua kawasan").waitFor();
	await expect(page.getByText("Pelat Terlihat", { exact: true })).toHaveCount(0);
});

test("the statistics map link reaches its screen", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	await page.getByRole("link", { name: "Buka Peta Penguasaan", exact: true }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Peta Penguasaan" })).toBeVisible();
});

test("the schedule parameters row in Setelan opens its screen", async ({ page }) => {
	await seen(page);
	await page.goto("/setelan");
	await page.getByRole("link", { name: /Parameter jadwal/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Parameter jadwal" })).toBeVisible();
	await expect(page.getByText("Bawaan FSRS-6")).toBeVisible();
	await expect(page.getByText("Mengumpulkan data")).toBeVisible();
	await expect(page.getByText("Belum ada optimasi.")).toBeVisible();
});

test("the account page offers a signed-out visitor sign-in, export and import", async ({
	page
}) => {
	await seen(page);
	await page.goto("/setelan/akun");
	await expect(page.getByRole("heading", { level: 1, name: "Akun" })).toBeVisible();
	await expect(page.getByText("Belum masuk")).toBeVisible();
	await expect(page.getByRole("button", { name: "Ekspor data" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Impor data" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Hapus akun" })).toHaveCount(0);
	await page.getByRole("button", { name: "Masuk" }).click();
	await expect(page).toHaveURL(/\/masuk$/);
	await expect(page.getByRole("heading", { level: 1, name: "Masuk" })).toBeVisible();
});

test("the sign-in page keeps the page it came from out of its address", async ({ page }) => {
	await seen(page);
	await page.goto("/setelan/akun");
	await page.getByRole("button", { name: "Masuk" }).click();
	await expect(page).toHaveURL(/\/masuk$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/setelan\/akun$/);
});

test("coverage selection changes the side panel", async ({ page }) => {
	await seen(page);
	await page.goto("/cakupan");
	await page.getByRole("button", { name: "Sumatera" }).first().click();
	await expect(page.getByRole("heading", { name: "Kawasan Sumatera" })).toBeVisible();
	await expect(page.getByText("kemajuan", { exact: true })).toBeVisible();
	await expect(page.getByText("Dikuasai", { exact: true })).toHaveCount(0);
	await page.getByRole("button", { name: "Seluruh Indonesia" }).first().click();
	await expect(page.getByText(/^\d+ materi baru tersedia$/)).toBeVisible();
});

test("enter on the highlighted row picks that region", async ({ page }) => {
	await seen(page);
	await page.goto("/cakupan");
	await page.getByRole("button", { name: "Sumatera" }).first().click();
	await expect(page.getByText("Wilayah disorot")).toBeVisible();
	await page.keyboard.press("Enter");
	await expect(page.getByText("Cakupan aktif")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Kawasan Sumatera" })).toBeVisible();
});

test("the keyboard page has its own address and Esc goes back", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await (await accountMenu(page)).getByRole("menuitem", { name: "Papan tombol" }).click();
	await expect(page).toHaveURL(/\/papan-tombol$/);
	await expect(page.getByRole("heading", { level: 1, name: "Papan tombol" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/beranda$/);
});

test("every text uses a design font", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
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
	await withLearned(page);
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
	await page.goto("/beranda");
	const dialog = page.getByRole("dialog", { name: "Terka" });
	await dialog.waitFor();
	for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
	expect(await dialog.evaluate((root) => root.contains(document.activeElement))).toBe(true);
	await page.keyboard.press("s");
	await expect(page).toHaveURL(/\/beranda$/);
});

test("the wheel zooms the map without scrolling the page", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	const map = page.getByRole("img", { name: "Peta Penguasaan per provinsi" });
	await map.scrollIntoViewIfNeeded();
	const before = await page.evaluate(() => window.scrollY);
	await map.hover();
	await page.mouse.wheel(0, -100);
	await expect(page.getByText("200%", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("the account menu leaves the keyboard page for Setelan", async ({ page }) => {
	await seen(page);
	await page.goto("/setelan");
	await (await accountMenu(page)).getByRole("menuitem", { name: "Papan tombol" }).click();
	await expect(page).toHaveURL(/\/papan-tombol$/);
	await (await accountMenu(page)).getByRole("menuitem", { name: "Setelan" }).click();
	await expect(page).toHaveURL(/\/setelan$/);
	await expect(page.getByRole("heading", { level: 1, name: "Setelan" })).toBeVisible();
});

test("shadowed buttons sink while pressed, links included", async ({ page }) => {
	const shadow = (locator: Locator) =>
		locator.evaluate((element) => getComputedStyle(element).boxShadow);
	await seen(page);
	await page.goto("/beranda");
	const start = page.getByRole("link", { name: "Mulai belajar" });
	await start.hover();
	await page.mouse.down();
	await expect.poll(() => shadow(start)).not.toContain("3px 3px");
	await page.mouse.up();
	await page.goto("/statistik");
	const zoomIn = page.getByRole("button", { name: "Perbesar" });
	await zoomIn.hover();
	await page.mouse.down();
	await expect.poll(() => shadow(zoomIn.locator("xpath=.."))).not.toContain("3px 3px");
	await page.mouse.up();
});

test("the account menu moves with the arrows and Esc gives focus back", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	const trigger = page.getByRole("button", { name: "Akun" });
	await trigger.click();
	await expect(page.getByRole("menuitem", { name: "Setelan" })).toBeFocused();
	await page.keyboard.press("ArrowDown");
	await expect(page.getByRole("menuitem", { name: "Papan tombol" })).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("menu")).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test("the account menu lists settings, shortcuts, export, import and sign-in for a visitor", async ({
	page
}) => {
	await seen(page);
	await page.goto("/beranda");
	const menu = await accountMenu(page);
	await expect(menu.getByRole("menuitem")).toHaveText([
		"Setelan",
		"Papan tombol",
		"Ekspor data",
		"Impor data",
		"Masuk"
	]);
	await menu.getByRole("menuitem", { name: "Masuk" }).click();
	await expect(page).toHaveURL(/\/masuk$/);
});

test("the sidebar's account menu opens upward and stays inside the sidebar", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	const trigger = (await page.getByRole("button", { name: "Akun" }).boundingBox())!;
	const menu = (await (await accountMenu(page)).boundingBox())!;
	const sidebar = (await page.locator("aside").first().boundingBox())!;
	expect(menu.y + menu.height).toBeLessThanOrEqual(trigger.y);
	expect(menu.x).toBeGreaterThanOrEqual(sidebar.x);
	expect(menu.x + menu.width).toBeLessThanOrEqual(sidebar.x + sidebar.width);
});

test("the statistics page no longer carries account controls", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	await expect(page.getByRole("heading", { level: 1, name: "Statistik" })).toBeVisible();
	await expect(page.locator("main").getByRole("button", { name: "Akun" })).toHaveCount(0);
	await expect(page.getByText("Akun dan sinkronisasi")).toHaveCount(0);
});

test("the statistics sync card shows the status and opens sign-in when signed out", async ({
	page
}) => {
	await seen(page);
	await page.goto("/statistik");
	const card = page
		.locator("main aside > *")
		.filter({ has: page.getByText("Sinkronisasi", { exact: true }) });
	await expect(card.getByText("Tersimpan di perangkat ini")).toBeVisible();
	await expect(page.getByText("Tersimpan di perangkat ini")).toHaveCount(1);
	await expect(card.getByText("Belum pernah sinkron")).toBeVisible();
	await expect(card.locator('[style*="cloud-off.svg"]')).toHaveCount(1);
	await expect(card.locator('[style*="cloud-check.svg"]')).toHaveCount(0);
	await expect(card.getByRole("button")).toHaveCount(1);
	await card.getByRole("button", { name: "Masuk untuk sinkronisasi" }).click();
	await expect(page).toHaveURL(/\/masuk$/);
});

// A point inside the province's own shape, not just inside its bounding box.
async function insideProvince(page: Page, id: string) {
	const path = page.locator(`path#${id}`);
	await path.waitFor();
	const find = () =>
		path.evaluate((element) => {
			const box = element.getBoundingClientRect();
			for (let y = 0.05; y < 1; y += 0.1)
				for (let x = 0.05; x < 1; x += 0.1) {
					const [px, py] = [box.left + box.width * x, box.top + box.height * y];
					if (document.elementFromPoint(px, py) === element) return { x: px, y: py };
				}
			return null;
		});
	// The map settles its layout after the SVG arrives.
	await expect.poll(find).not.toBeNull();
	return (await find())!;
}

test("enter without a highlighted suggestion shows every result", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	await search(page, "jawa timur");
	await expect(page.getByRole("listbox")).toBeVisible();
	await expect(page.locator('[role="option"][aria-selected="true"]')).toHaveCount(0);
	await page.locator("#referensi-search").press("Enter");
	await expect(page.getByRole("listbox")).toHaveCount(0);
	await expect(page.getByText(/^\d+ kode ditemukan\.$/)).toBeVisible();
	// Every match is a code detail card, each naming its province.
	await expect(page.getByText("Jawa Timur", { exact: true }).first()).toBeVisible();
	await search(page, "malang");
	await page.locator("#referensi-search").press("Enter");
	await expect(page.getByText("1 kode ditemukan.", { exact: true })).toBeVisible();
	await expect(page.getByText("kab/kota", { exact: true })).toHaveCount(1);
	await expect(page.getByText("provinsi", { exact: true })).toHaveCount(0);
	await search(page, "jawa timur");
	await page.locator("#referensi-search").press("Enter");
	await page.locator("#referensi-search").press("Escape");
	await expect(page.getByText("Semua kawasan")).toBeVisible();
});

test("arrow down then enter opens the first suggestion", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	await search(page, "jawa timur");
	await expect(page.getByRole("listbox")).toBeVisible();
	await page.locator("#referensi-search").press("ArrowDown");
	await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
	await page.locator("#referensi-search").press("Enter");
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
});

test("referensi opens what its address names", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?kode=bk");
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
	await page.goto("/referensi?kode=CD%2049");
	await expect(page.getByText("Bulgaria").first()).toBeVisible();
	await page.goto("/referensi?cari=sulawesi");
	await expect(page.getByText(/^\d+ kode ditemukan\.$/)).toBeVisible();
	await page.goto("/referensi?provinsi=riau");
	await expect(page.locator("#referensi-search")).toHaveValue("Riau");
	await expect(page.getByText("kab/kota", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("Kepulauan Riau", { exact: true })).toHaveCount(0);
	await page.goto("/referensi?kawasan=sulawesi");
	await expect(page.getByRole("button", { name: "Sulawesi", exact: true })).toHaveAttribute(
		"aria-pressed",
		"true"
	);
	await page.goto("/referensi?provinsi=xyz&kawasan=foo");
	await expect(page.getByRole("button", { name: "Semua kawasan" })).toHaveAttribute(
		"aria-pressed",
		"true"
	);
});

test("a code opened from the address is not a sighting", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?kode=BK");
	await page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.").waitFor();
	await page.waitForTimeout(2000);
	await page.goto("/referensi");
	await page.getByText("Semua kawasan").waitFor();
	await expect(page.getByText("Pelat Terlihat", { exact: true })).toHaveCount(0);
});

test("statistics chips and kawasan names open Referensi", async ({ page }) => {
	await seen(page);
	await withLearned(page);
	await page.goto("/statistik");
	await page
		.getByRole("link", { name: /^Lihat .+ di Referensi$/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/referensi\?kode=/);
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
	await page.goto("/statistik/peta");
	await page.getByRole("link", { name: "Sumatera", exact: true }).click();
	await expect(page).toHaveURL(/\/referensi\?kawasan=sumatera/);
});

test("a map province opens in Referensi, a drag does not", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik/peta");
	const point = await insideProvince(page, "jawa-timur");
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 80, point.y, { steps: 5 });
	await page.mouse.up();
	await expect(page).toHaveURL(/\/statistik\/peta$/);
	// Off the map, so the hover tooltip does not cover the province.
	await page.mouse.move(0, 0);
	const again = await insideProvince(page, "jawa-timur");
	await page.mouse.click(again.x, again.y);
	await expect(page).toHaveURL(/\/referensi\?provinsi=jawa-timur/);
	await expect(page.locator("#referensi-search")).toHaveValue("Jawa Timur");
});

test("enter right after typing ignores the highlight from the previous query", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	await search(page, "jawa");
	await expect(page.getByRole("listbox")).toBeVisible();
	await page.locator("#referensi-search").press("ArrowDown");
	await page.locator("#referensi-search").press("ArrowDown");
	await search(page, "jawa timur");
	await page.locator("#referensi-search").press("Enter");
	await expect(page.getByText(/^\d+ kode ditemukan\.$/)).toBeVisible();
});

test("a right click on a map province stays on the map", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik/peta");
	const point = await insideProvince(page, "jawa-timur");
	await page.mouse.click(point.x, point.y, { button: "right" });
	await page.waitForTimeout(500);
	await expect(page).toHaveURL(/\/statistik\/peta$/);
});

test("referensi's static page carries the search box before scripts run", async ({ request }) => {
	const html = await (await request.get("/referensi")).text();
	expect(html).toContain('id="referensi-search"');
});

test("a code card leaves out an empty kota or kabupaten group", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?cari=aceh%20timur");
	await expect(page.getByText("1 kode ditemukan.", { exact: true })).toBeVisible();
	await expect(page.getByText("Kabupaten", { exact: true })).toBeVisible();
	await expect(page.getByText("Kota", { exact: true })).toHaveCount(0);
});

test("the address follows what Referensi shows, without history steps", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik");
	await page.goto("/referensi");
	await search(page, "medan");
	await expect(page).toHaveURL(/\/referensi\?cari=medan$/);
	await page.getByRole("option").first().click();
	await expect(page).toHaveURL(/\/referensi\?kode=BK$/);
	await page.reload();
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
	await search(page, "timur");
	await page.locator("#referensi-search").press("Enter");
	await expect(page).toHaveURL(/\/referensi\?cari=timur$/);
	await page.reload();
	await expect(page.getByText(/^\d+ kode ditemukan\.$/)).toBeVisible();
	await page.getByRole("button", { name: "Hapus pencarian" }).click();
	await expect(page).toHaveURL(/\/referensi$/);
	await page.getByRole("button", { name: "Sulawesi", exact: true }).click();
	await expect(page).toHaveURL(/\/referensi\?kawasan=sulawesi$/);
	await page.reload();
	await expect(page.getByRole("button", { name: "Sulawesi", exact: true })).toHaveAttribute(
		"aria-pressed",
		"true"
	);
	await page.getByRole("button", { name: "Semua kawasan" }).click();
	await expect(page).toHaveURL(/\/referensi$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/statistik$/);
});

test("the search box stays in view while the results scroll", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?cari=timur");
	await page.getByText(/^\d+ kode ditemukan\.$/).waitFor();
	await page.mouse.wheel(0, 3000);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
	await expect(page.locator("#referensi-search")).toBeInViewport();
	// The stuck box lines up with the stuck side panel.
	const box = (await page.locator("#referensi-search").locator("..").boundingBox())!;
	const aside = (await page.locator("main aside").boundingBox())!;
	expect(Math.abs(box.y - aside.y)).toBeLessThanOrEqual(1);
});

test("diplomat results offer their practice once, in the side panel", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi?cari=cd");
	await page.getByText(/^\d+ kode ditemukan\.$/).waitFor();
	const practice = page.getByRole("link", { name: "Latih kode diplomat" });
	await expect(practice).toHaveCount(1);
	await expect(
		page.locator("main aside").getByRole("link", { name: "Latih kode diplomat" })
	).toBeVisible();
	await expect(page.locator("main aside").getByText("Pencarian", { exact: true })).toHaveCount(0);
});

test("every suggestion row keeps its areas on one line", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	await search(page, "bengkulu");
	const option = page.getByRole("option").first();
	await expect(option).toBeVisible();
	const heights = await option
		.locator("span")
		.evaluateAll((spans) => spans.map((span) => span.getBoundingClientRect().height));
	expect(Math.max(...heights)).toBeLessThan(30);
});

test("the about page credits its maker and says how to report data", async ({ page }) => {
	await seen(page);
	await page.goto("/tentang");
	await expect(page.getByRole("heading", { level: 1, name: "Tentang Terka" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Diky" })).toHaveAttribute(
		"href",
		"https://dikym.me"
	);
	await expect(page.getByRole("link", { name: "contact@terka.my.id" })).toHaveAttribute(
		"href",
		"mailto:contact@terka.my.id"
	);
	await expect(page.getByText("bukan rujukan resmi", { exact: false }).first()).toBeVisible();
});

for (const [path, title] of [
	["/tentang", "Tentang Terka"],
	["/privasi", "Kebijakan privasi"]
]) {
	test(`${path} opened directly has the site header and footer but no sidebar or back arrow`, async ({
		page
	}) => {
		await seen(page);
		await page.goto(path);
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
		await expect(page.locator("header").getByRole("link", { name: "Terka" })).toBeVisible();
		await expect(page.locator("footer").getByRole("link", { name: title })).toBeVisible();
		await expect(page.locator("aside")).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Kembali" })).toHaveCount(0);
		expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
	});

	test(`${path} opened from Setelan has the sidebar and back arrow but no site footer`, async ({
		page
	}) => {
		await seen(page);
		await page.goto("/setelan");
		await page.getByRole("link", { name: title, exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`${path}$`));
		await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
		await expect(page.locator("aside")).toBeVisible();
		await expect(page.locator("footer")).toHaveCount(0);
		await page.getByRole("link", { name: "Kembali" }).click();
		await expect(page).toHaveURL(/\/setelan$/);
	});
}

test("the about page keeps the sidebar when it leads on to the privacy policy from Setelan", async ({
	page
}) => {
	await seen(page);
	await page.goto("/setelan");
	await page.getByRole("link", { name: "Tentang Terka", exact: true }).click();
	await page.getByRole("link", { name: "Kebijakan privasi", exact: true }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Kebijakan privasi" })).toBeVisible();
	await expect(page.locator("aside")).toBeVisible();
});

test("a legal page typed into the address bar after Setelan is public again", async ({ page }) => {
	await seen(page);
	await page.goto("/setelan");
	await page.getByRole("link", { name: "Kebijakan privasi", exact: true }).click();
	await expect(page.locator("aside")).toBeVisible();
	await page.goto("/privasi");
	await expect(page.locator("footer")).toBeVisible();
	await expect(page.locator("aside")).toHaveCount(0);
});

test("reloading a legal page opened from Setelan keeps the sidebar", async ({ page }) => {
	await seen(page);
	await page.goto("/setelan");
	await page.getByRole("link", { name: "Tentang Terka", exact: true }).click();
	await page.reload();
	await expect(page.locator("aside")).toBeVisible();
	await expect(page.getByRole("link", { name: "Kembali" })).toBeVisible();
});

test("reloading a legal page opened from Setelan never paints the public frame", async ({
	page
}) => {
	await seen(page);
	await page.goto("/setelan");
	await page.getByRole("link", { name: "Kebijakan privasi", exact: true }).click();
	await expect(page.locator("aside")).toBeVisible();
	await page.route("**/_next/static/**/*.js", (route) => route.abort());
	await page.reload();
	await expect(page.getByRole("heading", { level: 1, name: "Kebijakan privasi" })).toBeHidden();
	await expect(page.locator("footer")).toBeHidden();
});

test("a chip in the region list or Pelat Terlihat opens its code", async ({ page }) => {
	await seen(page);
	await page.goto("/referensi");
	await page.getByRole("button", { name: "Buka BK", exact: true }).first().click();
	await expect(page).toHaveURL(/\/referensi\?kode=BK$/);
	await expect(
		page.getByText("1 kode ditemukan, diurutkan dari kota lalu kabupaten.")
	).toBeVisible();
	// Settled long enough to count as a sighting.
	await page.waitForTimeout(2000);
	await page.getByRole("button", { name: "Hapus pencarian" }).click();
	const card = page.locator("main aside");
	await expect(
		card.getByText("3 kode yang paling sering terlihat", { exact: false })
	).toBeVisible();
	await card.getByRole("button", { name: "Buka BK", exact: true }).click();
	await expect(page).toHaveURL(/\/referensi\?kode=BK$/);
});

test("a shortened area list in the weakest codes table shows in full on hover", async ({
	page
}) => {
	await seen(page);
	await page.goto("/beranda");
	await seed(page, missedLog(), { logVersion: 1000 });
	await page.goto("/statistik");
	const cell = page.getByText(/^Kota Medan, Kota Binjai, dan \d+ lainnya$/);
	await cell.hover();
	await expect(page.getByRole("tooltip")).toHaveText(/^Kota Medan, Kota Binjai, .+, .+, .+$/);
	// A long list wraps inside the tooltip's max width instead of running across the page.
	const box = (await page.getByRole("tooltip").boundingBox())!;
	expect(box.width).toBeLessThanOrEqual(288);
});

test("a menu opened with the mouse highlights nothing until hovered", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await page.getByRole("button", { name: "Akun" }).click();
	const first = page.getByRole("menuitem", { name: "Setelan" });
	await expect(first).toBeFocused();
	const background = (item: Locator) =>
		item.evaluate((element) => getComputedStyle(element).backgroundColor);
	expect(await background(first)).toBe("rgba(0, 0, 0, 0)");
	await page.keyboard.press("ArrowDown");
	const second = page.getByRole("menuitem", { name: "Papan tombol" });
	await expect(second).toBeFocused();
	expect(await background(second)).not.toBe("rgba(0, 0, 0, 0)");
});

test("a code link is exactly as wide as its chip", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	await seed(page, missedLog(), { logVersion: 1000 });
	await page.goto("/referensi");
	// N becomes a sighting, so Statistik shows it in Pelat Terlihat, a fixed-width grid column.
	await search(page, "N");
	await page.waitForTimeout(2000);
	await page.goto("/statistik");
	const links = page.getByRole("link", { name: /^Lihat .+ di Referensi$/ });
	await expect(page.getByRole("link", { name: "Lihat N di Referensi" })).toBeVisible();
	for (const link of await links.all()) {
		const outer = (await link.boundingBox())!;
		const chip = (await link.locator("span").first().boundingBox())!;
		expect(outer.width).toBeCloseTo(chip.width, 0);
	}
});

test("the kawasan dots stay round on a narrow screen", async ({ page }) => {
	await seen(page);
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto("/statistik");
	await page.getByRole("heading", { name: "Lolos per level" }).waitFor();
	const dots = page.locator("svg[class*='text-group-']");
	await dots.first().waitFor();
	for (const dot of await dots.all()) {
		const box = (await dot.boundingBox())!;
		expect(box.width).toBeCloseTo(box.height, 1);
	}
});

test("the home page's code chips open Referensi", async ({ page }) => {
	await seen(page);
	// A kawasan scope lists its provinces with their code chips.
	await page.goto("/cakupan");
	await page.getByRole("button", { name: "Sumatera" }).first().click();
	await page.keyboard.press("Enter");
	await expect(page.getByText("Cakupan aktif")).toBeVisible();
	await page.goto("/beranda");
	const chip = page.getByRole("link", { name: /^Lihat .+ di Referensi$/ }).first();
	await expect(chip).toBeVisible();
	await chip.click();
	await expect(page).toHaveURL(/\/referensi\?kode=/);
});

test("a shadowed button drops its shadow under the keyboard focus outline", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	const start = page.getByRole("link", { name: /Mulai belajar/ });
	await start.waitFor();
	await page.keyboard.press("Tab");
	await start.focus();
	const look = () =>
		start.evaluate((element) => {
			const style = getComputedStyle(element);
			return { outline: style.outlineStyle, shadow: style.boxShadow };
		});
	await expect.poll(async () => (await look()).outline).toBe("solid");
	// The shadow eases over 90 ms.
	await expect
		.poll(async () => (await look()).shadow)
		.toMatch(/^(none|(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?)+)$/);
});
