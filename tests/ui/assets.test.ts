import { expect, test } from "bun:test";
import { FLAG_CODES, ICON_NAMES } from "../../src/components/ui/icon";

test("every icon name has a file without embedded metadata", async () => {
	for (const name of ICON_NAMES) {
		const svg = await Bun.file(`public/icons/${name}.svg`).text();
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).not.toContain("<metadata");
	}
});

test("every flag code has a file", async () => {
	for (const code of FLAG_CODES)
		expect(await Bun.file(`public/flags/${code}.svg`).exists()).toBe(true);
});
