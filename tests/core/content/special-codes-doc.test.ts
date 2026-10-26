import { expect, test } from "bun:test";

type Special = {
	number: string;
	holder: string;
	holderType: "country" | "organization";
	sourceName: string;
	aliases: string[];
	confidence: string;
};

const data: { specials: Special[] } = await Bun.file(
	new URL("../../../data/special-codes.json", import.meta.url)
).json();
const doc = await Bun.file(new URL("../../../docs/Terka_Special_Codes.md", import.meta.url)).text();

const TYPES: Record<string, Special["holderType"]> = {
	negara: "country",
	organisasi: "organization"
};

// The CD table in the editorial document and the data the build reads must list the same entries.
test("the diplomatic code table matches the special codes data row by row", () => {
	const rows = doc
		.split("\n")
		.filter((line) => /^\| CD \d+\s*\|/.test(line))
		.map((line) => {
			const [code, holder, type, sourceName, aliases, label] = line
				.split("|")
				.slice(1, -1)
				.map((cell) => cell.trim());
			return {
				number: code.replace("CD ", ""),
				holder,
				holderType: TYPES[type],
				sourceName,
				aliases: aliases === "—" ? [] : aliases.split(", "),
				confidence: label.replaceAll("`", "")
			};
		});
	expect(rows).toHaveLength(130);
	expect(rows).toEqual(
		data.specials.map(({ number, holder, holderType, sourceName, aliases, confidence }) => ({
			number,
			holder,
			holderType,
			sourceName,
			aliases,
			confidence
		}))
	);
});
