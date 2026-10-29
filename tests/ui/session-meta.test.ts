import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LevelMark, levelName } from "../../src/components/screens/session/indicators";
import { type BarProps, SessionMeta } from "../../src/components/screens/session/session-bar";

const bar = (mode: BarProps["mode"], level: BarProps["level"] = null): BarProps => ({
	mode,
	card: null,
	level,
	done: 1,
	total: 5,
	finished: false,
	onExit: () => {}
});

// A tooltip's trigger wraps the labelled icon; a bare icon would have no wrapper of this kind.
const explained = (html: string, label: string) =>
	html.includes(
		`<span class="-m-2 inline-flex flex-none p-2"><span role="img" aria-label="${label}"`
	);

test("each of the three levels names its squares and its icon in a tooltip", () => {
	for (const level of [1, 2, 3] as const) {
		const html = renderToStaticMarkup(createElement(LevelMark, { level }));
		expect(explained(html, `Level ${level}`)).toBe(true);
		expect(explained(html, levelName(level))).toBe(true);
	}
	expect([1, 2, 3].map((level) => levelName(level as 1 | 2 | 3))).toEqual([
		"Kenali",
		"Ingat",
		"Kuasai"
	]);
});

test("the icon of every mode beside the question is explained by a tooltip", () => {
	for (const [mode, label] of [
		["kilat", "Mode Kilat"],
		["tantangan", "Tantangan Harian"],
		["terfokus", "Latihan Terfokus"],
		["diplomat", "Kode diplomat"]
	] as const) {
		const html = renderToStaticMarkup(createElement(SessionMeta, bar(mode)));
		expect([mode, explained(html, label)]).toEqual([mode, true]);
	}
});

test("the level of a question shows beside its mode icon", () => {
	const html = renderToStaticMarkup(createElement(SessionMeta, bar("terfokus", 3)));
	expect(explained(html, "Level 3")).toBe(true);
	expect(explained(html, "Kuasai")).toBe(true);
});
