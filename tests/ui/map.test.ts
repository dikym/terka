import { expect, test } from "bun:test";
import {
	clampView,
	fillStep,
	flingStep,
	flingVelocity,
	isTap,
	layerTransform,
	pinchView,
	VIEW,
	wheelZoom
} from "@/components/ui/mastery-map";
import { mapProvinces } from "@/lib/view/map";
import { stateOf } from "../core/replay/fixtures";
import plates from "@/data/plates.json";
import type { Bundle } from "@/core/content/schema";

test("fill step follows the legend bands", () => {
	expect([null, 0, 1, 33, 34, 66, 67, 99, 100].map(fillStep)).toEqual([
		0, 1, 2, 2, 3, 3, 4, 4, 5
	]);
});

test("the shipped data covers every province in the map file", async () => {
	const bundle = plates as Bundle;
	const provinces = mapProvinces(stateOf([], bundle), bundle);
	const svg = await Bun.file("public/map.svg").text();
	const ids = [...svg.matchAll(/<path[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
	expect(ids.length).toBe(38);
	for (const id of ids) expect(provinces[id]).toBeDefined();
});

test("a mouse wheel notch zooms one level, animated", () => {
	expect(wheelZoom(-100, 0, false)).toEqual({ factor: 2, animate: true });
	expect(wheelZoom(100, 0, false)).toEqual({ factor: 0.5, animate: true });
	// Firefox counts a notch in lines.
	expect(wheelZoom(-3, 1, false)).toEqual({ factor: 2, animate: true });
});

test("a trackpad zooms continuously with the gesture", () => {
	const pinch = wheelZoom(-2, 0, true);
	expect(pinch.animate).toBe(false);
	expect(pinch.factor).toBeCloseTo(2 ** 0.02, 5);
	const swipe = wheelZoom(-6, 0, false);
	expect(swipe.animate).toBe(false);
	expect(swipe.factor).toBeCloseTo(2 ** 0.06, 5);
	// A full pinch of about 100 pixels doubles the scale, like one notch.
	expect(wheelZoom(-100, 0, true).factor).toBeCloseTo(2, 5);
});

test("a tap stays near where it landed and lifts soon", () => {
	expect(isTap({ x: 5, y: 5, at: 100 }, 5, 12, 450)).toBe(true);
	expect(isTap({ x: 0, y: 0, at: 0 }, 8, 0, 100)).toBe(false);
	expect(isTap({ x: 0, y: 0, at: 0 }, -6, 6, 100)).toBe(false);
	expect(isTap({ x: 0, y: 0, at: 0 }, 0, 0, 400)).toBe(false);
});

test("the gesture layer puts every point where the live view would draw it", () => {
	const view = VIEW;
	const box = { width: 540, height: 300 };
	const unit = view.w / box.width;
	const pad = (box.height - view.h / unit) / 2;
	const screen = (v: { k: number; x: number; y: number }, ux: number, uy: number) => ({
		x: (v.k * ux + v.x - view.x) / unit,
		y: (v.k * uy + v.y - view.y) / unit + pad
	});
	const base = { k: 2, x: -100, y: -50 };
	const live = { k: 5, x: -700, y: -300 };
	const layer = layerTransform(base, live, box);
	for (const [ux, uy] of [
		[0, 0],
		[100, 60],
		[640, 300]
	]) {
		const from = screen(base, ux, uy);
		const to = screen(live, ux, uy);
		expect(from.x * layer.scale + layer.x).toBeCloseTo(to.x, 6);
		expect(from.y * layer.scale + layer.y).toBeCloseTo(to.y, 6);
	}
});

test("a pinch keeps the map point under the fingers' midpoint under it", () => {
	const box = { left: 0, top: 0, width: VIEW.w, height: VIEW.h };
	const anchor = { k: 2, x: -100, y: -50 };
	const view = pinchView(
		anchor,
		[
			{ x: 100, y: 100 },
			{ x: 200, y: 100 }
		],
		[
			{ x: 50, y: 150 },
			{ x: 250, y: 150 }
		],
		box
	);
	expect(view.k).toBe(4);
	const [fromX, fromY] = [150 + VIEW.x, 100 + VIEW.y];
	const [toX, toY] = [150 + VIEW.x, 150 + VIEW.y];
	expect((toX - view.x) / view.k).toBeCloseTo((fromX - anchor.x) / anchor.k, 6);
	expect((toY - view.y) / view.k).toBeCloseTo((fromY - anchor.y) / anchor.k, 6);
});

test("a pinch stops at the zoom limits", () => {
	const box = { left: 0, top: 0, width: VIEW.w, height: VIEW.h };
	const from = [
		{ x: 100, y: 100 },
		{ x: 200, y: 100 }
	];
	const apart = [
		{ x: 0, y: 100 },
		{ x: 1000, y: 100 }
	];
	const together = [
		{ x: 149, y: 100 },
		{ x: 151, y: 100 }
	];
	expect(pinchView({ k: 5, x: 0, y: 0 }, from, apart, box).k).toBe(10);
	expect(pinchView({ k: 1.5, x: 0, y: 0 }, from, together, box).k).toBe(1);
});

// A phone: the box holds more height than the view.
const phone = { left: 0, top: 0, width: 390, height: 210 };

test("the land rests in the middle of the box at full view", () => {
	const view = clampView({ k: 1, x: 300, y: 200 }, phone);
	expect(view.x).toBeCloseTo(0, 6);
	expect(view.y).toBeCloseTo(0, 6);
});

test("the land stops the same margin from every side of the box", () => {
	expect(clampView({ k: 2, x: -300, y: -200 }, phone)).toEqual({ k: 2, x: -300, y: -200 });
	expect(clampView({ k: 2, x: 500, y: 0 }, phone).x).toBeCloseTo(-1.4, 6);
	expect(clampView({ k: 2, x: -5000, y: 0 }, phone).x).toBeCloseTo(-999, 6);
	expect(clampView({ k: 2, x: 0, y: 500 }, phone).y).toBeCloseTo(-79.86, 1);
	expect(clampView({ k: 2, x: 0, y: -5000 }, phone).y).toBeCloseTo(-293.84, 1);
});

test("land too short to reach both margins stays centred", () => {
	expect(clampView({ k: 1.25, x: 0, y: -500 }, phone).y).toBeCloseTo(-46.71, 1);
	expect(clampView({ k: 1.25, x: 0, y: 500 }, phone).y).toBeCloseTo(-46.71, 1);
});

test("a fling takes the finger's speed from its last moments", () => {
	const trail = [
		{ x: 0, y: 0, at: 0 },
		{ x: 100, y: 50, at: 200 },
		{ x: 180, y: 50, at: 280 },
		{ x: 260, y: 90, at: 360 }
	];
	const speed = flingVelocity(trail, 370);
	expect(speed.x).toBeCloseTo(1, 6);
	expect(speed.y).toBeCloseTo(0.5, 6);
});

test("a finger that rests before lifting has no fling", () => {
	const trail = [
		{ x: 0, y: 0, at: 0 },
		{ x: 100, y: 0, at: 50 }
	];
	expect(flingVelocity(trail, 300)).toEqual({ x: 0, y: 0 });
	expect(flingVelocity(trail.slice(0, 1), 5)).toEqual({ x: 0, y: 0 });
});

test("a fling slows down and covers a set distance whatever the frame rate", () => {
	const travel = (frame: number) => {
		let velocity = 0.8;
		let distance = 0;
		for (let t = 0; t < 4000; t += frame) {
			const step = flingStep(velocity, frame);
			expect(Math.abs(step.velocity)).toBeLessThan(velocity);
			velocity = step.velocity;
			distance += step.distance;
		}
		return distance;
	};
	expect(travel(8)).toBeCloseTo(travel(33), 3);
	expect(travel(16)).toBeCloseTo(240, 1);
});

test("a province counts its codes, not its cards", () => {
	const bundle = plates as unknown as Bundle;
	const state = stateOf([], bundle);
	const jawaBarat = bundle.regions.filter((region) => region.province === "jawa-barat");
	for (const region of jawaBarat)
		for (const mode of ["code2region", "region2code", "setrecall"]) {
			const card = state.cards.get(`${region.id}::${mode}`);
			if (card)
				state.cards.set(card.cardId, {
					...card,
					state: "mature",
					intervalDays: 30,
					passedLevel3: true
				});
		}
	const [first] = jawaBarat;
	const reverse = state.cards.get(`${first.id}::region2code`)!;
	state.cards.set(reverse.cardId, { ...reverse, state: "review", intervalDays: 3 });
	const province = mapProvinces(state, bundle)["jawa-barat"];
	expect(province.total).toBe(jawaBarat.length);
	expect(province.mastered).toBe(jawaBarat.length - 1);
});
