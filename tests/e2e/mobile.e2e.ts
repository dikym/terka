import { expect, type Locator, type Page, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import type { Bundle } from "@/core/content/schema";
import plates from "@/data/plates.json";
import { justLearnedLog, learnedLog } from "./support/logs";
import { opened } from "./support/routes";
import { seed } from "./support/seed";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const seen = async (page: Page) =>
	page.addInitScript(() => localStorage.setItem("terka.welcomeSeen", "1"));

const tabBar = (page: Page) => page.getByRole("navigation").last();

/** A point inside the province's own shape, not just inside its bounding box. */
const insideShape = async (path: Locator) => {
	const point = await path.evaluate((element) => {
		const box = element.getBoundingClientRect();
		for (let y = 0.1; y < 1; y += 0.1)
			for (let x = 0.1; x < 1; x += 0.1) {
				const [px, py] = [box.left + box.width * x, box.top + box.height * y];
				if (document.elementFromPoint(px, py) === element) return { x: px, y: py };
			}
		return null;
	});
	return point!;
};

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

test.describe("map gestures", () => {
	type Point = [number, number];

	// Several fingers at once take the DevTools protocol, which only Chromium speaks.
	test.skip(({ browserName }) => browserName !== "chromium");

	const openMap = async (page: Page) => {
		await seen(page);
		await page.goto("/statistik/peta");
		const map = page.getByRole("img", { name: "Peta Penguasaan per provinsi" });
		await expect(map.locator("path#kalimantan-barat")).toBeAttached();
		await page.getByText("Sumatera", { exact: true }).first().waitFor();
		const province = await insideShape(map.locator("path#kalimantan-barat"));
		const wrap = map.locator("xpath=..");
		const box = (await wrap.boundingBox())!;
		const cdp = await page.context().newCDPSession(page);
		const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) =>
			cdp.send("Input.dispatchTouchEvent", {
				type,
				touchPoints: points.map(([x, y], id) => ({ x, y, id }))
			});
		return {
			touch,
			// The legend under the map also prints percentages.
			zoom: (label: string) => wrap.getByText(label, { exact: true }),
			province: [province.x, province.y] as Point,
			map,
			// Inside the map's box, below the land.
			belowY: box.y + box.height - 6,
			// Past the box, on the content under it.
			outsideY: box.y + box.height + 30
		};
	};

	const noSelection = async (page: Page) => {
		// Long enough for a selection, if one was coming, to have rendered.
		await page.waitForTimeout(150);
		await expect(page.getByRole("link", { name: "Lihat di Referensi" })).toHaveCount(0);
	};

	test("two fingers lifted without moving select nothing", async ({ page }) => {
		const { touch, province } = await openMap(page);
		const other: Point = [province[0] + 60, province[1]];
		await touch("touchStart", [province]);
		await touch("touchStart", [province, other]);
		await touch("touchEnd", [other]);
		await touch("touchEnd", []);
		await noSelection(page);
	});

	for (const [where, y] of [
		["below the land", "belowY"],
		["past the map's box", "outsideY"]
	] as const)
		test(`a pinch with one finger still and one ${where} zooms and selects nothing`, async ({
			page
		}) => {
			const opened = await openMap(page);
			const { touch, zoom, province } = opened;
			const other = (offset: number): Point => [province[0], opened[y] + offset];
			await touch("touchStart", [province]);
			await touch("touchStart", [province, other(0)]);
			for (const offset of [6, 12, 18, 24])
				await touch("touchMove", [province, other(offset)]);
			await touch("touchEnd", [province]);
			await touch("touchEnd", []);
			await expect(zoom("100%")).toHaveCount(0);
			await noSelection(page);
		});

	test("a drag from below the land leaves the page where it is", async ({ page }) => {
		const { touch, belowY } = await openMap(page);
		await touch("touchStart", [[195, belowY]]);
		for (const rise of [12, 24, 36, 48, 60]) await touch("touchMove", [[195, belowY - rise]]);
		await touch("touchEnd", []);
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	});

	test("a finger that shifts a little on landing still selects", async ({ page }) => {
		const { touch, province } = await openMap(page);
		await touch("touchStart", [province]);
		await touch("touchMove", [[province[0] + 3, province[1] + 2]]);
		await touch("touchEnd", []);
		await expect(page.getByRole("link", { name: "Lihat di Referensi" })).toBeVisible();
	});

	test("a finger resting before it lifts selects nothing", async ({ page }) => {
		const { touch, province } = await openMap(page);
		await touch("touchStart", [province]);
		await page.waitForTimeout(450);
		await touch("touchEnd", []);
		await noSelection(page);
	});

	const zoomedIn = async (page: Page, map: Locator) => {
		const zoomIn = page.getByRole("button", { name: "Perbesar" });
		await zoomIn.tap();
		await zoomIn.tap();
		await page.waitForTimeout(350);
		const province = map.locator("path#kalimantan-barat");
		return () => province.evaluate((path) => path.getBoundingClientRect().left);
	};

	const painted = (map: Locator) =>
		map.evaluate((svg) => ({
			layer: (svg as unknown as SVGElement).style.transform,
			land: (svg.querySelector("g[style]") as SVGGElement).style.transform
		}));

	test("a drag moves the map as one layer and never redraws the land", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const left = await zoomedIn(page, map);
		const [before, startLeft] = [await painted(map), await left()];
		await touch("touchStart", [[195, 165]]);
		await touch("touchMove", [[215, 165]]);
		await touch("touchMove", [[235, 165]]);
		// Chromium hands moves over with the next frame.
		await page.waitForTimeout(50);
		const during = await painted(map);
		const duringLeft = await left();
		expect(during.land).toBe(before.land);
		expect(during.layer).not.toBe("");
		expect(duringLeft - startLeft).toBeCloseTo(40, 0);
		await touch("touchEnd", []);
		await page.waitForTimeout(600);
		expect((await painted(map)).land).toBe(before.land);
		expect(await left()).toBeCloseTo(duringLeft, 0);
	});

	test("a finger on the box still drags after the map has moved off that spot", async ({
		page
	}) => {
		const { touch, map, belowY } = await openMap(page);
		const left = await zoomedIn(page, map);
		await touch("touchStart", [[195, 165]]);
		for (const dx of [50, 100, 150]) await touch("touchMove", [[195 + dx, 165]]);
		await page.waitForTimeout(50);
		await touch("touchEnd", []);
		await page.waitForTimeout(100);
		const start = await left();
		await touch("touchStart", [[20, belowY]]);
		await touch("touchMove", [[50, belowY]]);
		await touch("touchMove", [[80, belowY]]);
		await page.waitForTimeout(50);
		expect((await left()) - start).toBeCloseTo(60, 0);
		await touch("touchEnd", []);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	});

	const pinchOut = async (
		touch: (type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) => unknown
	) => {
		await touch("touchStart", [[150, 165]]);
		await touch("touchStart", [
			[150, 165],
			[240, 165]
		]);
		await touch("touchMove", [
			[120, 165],
			[270, 165]
		]);
		await touch("touchEnd", [[270, 165]]);
		await touch("touchEnd", []);
	};

	test("a pinch redraws the land sharp soon after the fingers lift, without a jump", async ({
		page
	}) => {
		const { touch, map, zoom } = await openMap(page);
		const before = await painted(map);
		await pinchOut(touch);
		await zoom("167%").waitFor();
		const lefts = await map.evaluate(
			(svg, land) =>
				new Promise<number[]>((done) => {
					const province = svg.querySelector("path#kalimantan-barat")!;
					const group = svg.querySelector("g[style]") as SVGGElement;
					const seen: number[] = [];
					const frame = () => {
						seen.push(province.getBoundingClientRect().left);
						if (group.style.transform !== land && seen.length > 3) done(seen);
						else requestAnimationFrame(frame);
					};
					requestAnimationFrame(frame);
				}),
			before.land
		);
		expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1);
	});

	const pinchedThenDragging = async (page: Page) => {
		const opened = await openMap(page);
		const before = await painted(opened.map);
		await pinchOut(opened.touch);
		await opened.zoom("167%").waitFor();
		return { ...opened, before };
	};

	test("the land waits to go sharp while the finger is on the move", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const before = await painted(map);
		const province = map.locator("path#kalimantan-barat");
		const left = () => province.evaluate((path) => path.getBoundingClientRect().left);
		await pinchOut(touch);
		// Straight after the lift, well inside the wait before the redraw.
		await touch("touchStart", [[100, 165]]);
		let x = 100;
		await touch("touchMove", [[++x, 165]]);
		await page.waitForTimeout(15);
		const start = await left();
		const from = x;
		for (const end = Date.now() + 500; Date.now() < end;) {
			await page.waitForTimeout(15);
			await touch("touchMove", [[++x, 165]]);
		}
		expect((await painted(map)).land).toBe(before.land);
		await page.waitForTimeout(50);
		expect((await left()) - start).toBeCloseTo(x - from, 0);
		await touch("touchEnd", []);
	});

	test("a finger that never stops moving only delays the land going sharp", async ({ page }) => {
		const { touch, map, before } = await pinchedThenDragging(page);
		const province = map.locator("path#kalimantan-barat");
		const left = () => province.evaluate((path) => path.getBoundingClientRect().left);
		await touch("touchStart", [[100, 165]]);
		const start = await left();
		let x = 100;
		for (const end = Date.now() + 1400; Date.now() < end;) {
			await page.waitForTimeout(15);
			x += 1;
			await touch("touchMove", [[x % 2 ? 100 : 101, 165]]);
		}
		expect((await painted(map)).land).not.toBe(before.land);
		await page.waitForTimeout(50);
		expect(Math.abs((await left()) - start)).toBeLessThan(2);
		await touch("touchEnd", []);
	});

	test("the land goes sharp as soon as a finger rests", async ({ page }) => {
		const { touch, map, before } = await pinchedThenDragging(page);
		await touch("touchStart", [[100, 165]]);
		await expect
			.poll(async () => (await painted(map)).land, { timeout: 500 })
			.not.toBe(before.land);
		await touch("touchEnd", []);
	});

	test("a pinch lands where the fingers left it", async ({ page }) => {
		const { touch, map, zoom } = await openMap(page);
		const province = map.locator("path#kalimantan-barat");
		const left = () => province.evaluate((path) => path.getBoundingClientRect().left);
		await touch("touchStart", [[150, 165]]);
		await touch("touchStart", [
			[150, 165],
			[240, 165]
		]);
		for (const spread of [10, 20, 30])
			await touch("touchMove", [
				[150 - spread, 165],
				[240 + spread, 165]
			]);
		// Chromium hands moves over with the next frame.
		await page.waitForTimeout(50);
		const duringLeft = await left();
		await touch("touchEnd", [[240 + 30, 165]]);
		await touch("touchEnd", []);
		await zoom("167%").waitFor();
		await page.waitForTimeout(100);
		expect(await left()).toBeCloseTo(duringLeft, 0);
	});

	test("a pinch keeps the point between the fingers still", async ({ page }) => {
		const { touch, map, zoom } = await openMap(page);
		const province = map.locator("path#kalimantan-barat");
		const left = () => province.evaluate((path) => path.getBoundingClientRect().left);
		const startLeft = await left();
		await touch("touchStart", [[150, 165]]);
		await touch("touchStart", [
			[150, 165],
			[240, 165]
		]);
		await touch("touchMove", [
			[120, 165],
			[270, 165]
		]);
		await touch("touchEnd", [[270, 165]]);
		await touch("touchEnd", []);
		await zoom("167%").waitFor();
		expect(await left()).toBeCloseTo(195 + ((startLeft - 195) * 150) / 90, 0);
	});

	test("the browser never gets to take a finger over from the map", async ({ page }) => {
		const { touch, province } = await openMap(page);
		await page.evaluate(() => {
			const seen: Record<string, boolean> = {};
			(window as unknown as { touchSeen: typeof seen }).touchSeen = seen;
			for (const type of ["touchstart", "touchmove"])
				window.addEventListener(type, (event) => (seen[type] = event.defaultPrevented));
		});
		await touch("touchStart", [province]);
		await touch("touchMove", [[province[0] + 20, province[1]]]);
		await touch("touchEnd", []);
		await page.waitForTimeout(50);
		expect(
			await page.evaluate(() => (window as unknown as { touchSeen: object }).touchSeen)
		).toEqual({ touchstart: true, touchmove: true });
	});

	test("a long drag follows the finger", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const left = await zoomedIn(page, map);
		const start = await left();
		await touch("touchStart", [[195, 165]]);
		for (const dx of [30, 60, 90, 120, 150]) await touch("touchMove", [[195 + dx, 165]]);
		await page.waitForTimeout(50);
		expect((await left()) - start).toBeCloseTo(150, 0);
		await touch("touchEnd", []);
	});

	test("a drag at full view leaves the map centred", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const province = map.locator("path#kalimantan-barat");
		const left = () => province.evaluate((path) => path.getBoundingClientRect().left);
		const start = await left();
		await touch("touchStart", [[195, 165]]);
		await touch("touchMove", [[295, 165]]);
		await page.waitForTimeout(50);
		await touch("touchEnd", []);
		await page.waitForTimeout(50);
		expect(await left()).toBeCloseTo(start, 0);
	});

	const flick = async (
		touch: (type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) => unknown,
		page: Page
	) => {
		await touch("touchStart", [[120, 165]]);
		for (const dx of [20, 40, 60, 80, 100, 120]) {
			await touch("touchMove", [[120 + dx, 165]]);
			await page.waitForTimeout(8);
		}
		await touch("touchEnd", []);
	};

	test("a flick carries the map on after the finger lifts", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const left = await zoomedIn(page, map);
		const start = await left();
		await flick(touch, page);
		await page.waitForTimeout(1500);
		expect((await left()) - start).toBeGreaterThan(140);
		const settled = await left();
		await page.waitForTimeout(100);
		expect(await left()).toBe(settled);
	});

	test("a finger catches a gliding map and drags it straight away, selecting nothing", async ({
		page
	}) => {
		const { touch, map } = await openMap(page);
		const left = await zoomedIn(page, map);
		await flick(touch, page);
		await touch("touchStart", [[120, 165]]);
		await page.waitForTimeout(50);
		const caught = await left();
		await page.waitForTimeout(100);
		expect(await left()).toBe(caught);
		await touch("touchMove", [[150, 165]]);
		await touch("touchMove", [[180, 165]]);
		await page.waitForTimeout(50);
		expect((await left()) - caught).toBeCloseTo(60, 0);
		await touch("touchEnd", []);
		await noSelection(page);
	});

	test("a touch stops a glide and selects nothing", async ({ page }) => {
		const { touch, map } = await openMap(page);
		const left = await zoomedIn(page, map);
		await flick(touch, page);
		const stopped = await insideShape(map.locator("path#kalimantan-barat"));
		await touch("touchStart", [[stopped.x, stopped.y]]);
		await touch("touchEnd", []);
		await noSelection(page);
		const settled = await left();
		await page.waitForTimeout(100);
		expect(await left()).toBe(settled);
	});

	test("a swipe that comes back to where it began selects nothing", async ({ page }) => {
		const { touch, province } = await openMap(page);
		await touch("touchStart", [province]);
		for (const dx of [12, 24, 12, 0])
			await touch("touchMove", [[province[0] + dx, province[1]]]);
		await touch("touchEnd", []);
		await noSelection(page);
	});

	test("the zoom buttons work and do not select the last province pressed", async ({ page }) => {
		const { touch, zoom, province } = await openMap(page);
		await touch("touchStart", [province]);
		await touch("touchMove", [[province[0] + 20, province[1]]]);
		await touch("touchEnd", []);
		await page.getByRole("button", { name: "Perbesar" }).tap();
		await zoom("160%").waitFor();
		await noSelection(page);
	});
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
	// Not the mouse wheel: mobile WebKit does not support it.
	await page.evaluate(() => window.scrollBy(0, 400));
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

test("each icon beside the question explains itself on a tap", async ({ page }) => {
	await seen(page);
	await page.goto("/beranda");
	const ids = (plates as unknown as Bundle).regions.map((region) => region.id);
	await seed(page, justLearnedLog(ids), { logVersion: 1000 });
	await page.goto("/sesi");
	await page.getByRole("button", { name: "Mulai" }).click();
	await page.getByRole("heading", { level: 2 }).waitFor();
	const level = page.getByRole("img", { name: /^Level \d$/ }).filter({ visible: true });
	const name = page
		.getByRole("img", { name: /^(Kenali|Ingat|Kuasai)$/ })
		.filter({ visible: true });
	const focused = page.getByRole("img", { name: "Latihan Terfokus" }).filter({ visible: true });
	for (const icon of [focused, level, name]) {
		const label = await icon.getAttribute("aria-label");
		await icon.tap();
		await expect(page.getByRole("tooltip")).toHaveText(label!);
		await page.getByRole("heading", { level: 2 }).tap();
		await expect(page.getByRole("tooltip")).toHaveCount(0);
	}
});

test("a tapped map province stays on the map and links to Referensi", async ({ page }) => {
	await seen(page);
	await page.goto("/statistik/peta");
	const path = page.locator("path#jawa-timur");
	// The phone map ignores taps until the data is in.
	await page.getByText("Sumatera", { exact: true }).first().waitFor();
	const point = await insideShape(path);
	await page.touchscreen.tap(point.x, point.y);
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
