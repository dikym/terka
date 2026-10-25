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

test("every country with a diplomat code shows its flag", async () => {
	const { holderFlag } = await import("../../src/lib/view/flags");
	const plates = await Bun.file("src/data/plates.json").json();
	for (const special of plates.specials) {
		const flag = holderFlag(special);
		if (special.holderType === "country") expect(flag, special.holder).toBeDefined();
		if (flag) expect(await Bun.file(`public/flags/${flag}.svg`).exists()).toBe(true);
	}
});

test("UN bodies and the EU fly their flag", async () => {
	const { holderFlag } = await import("../../src/lib/view/flags");
	const plates = await Bun.file("src/data/plates.json").json();
	const flagOf = (id: string) =>
		holderFlag(plates.specials.find((s: { id: string }) => s.id === id));
	expect(flagOf("cd-71-unicef")).toBe("un");
	expect(flagOf("cd-99-uni-eropa")).toBe("eu");
	expect(flagOf("cd-77-bank-dunia")).toBeUndefined();
});
