import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContent, parseFacts } from "../src/lib/terka/content-rules";

const source = { ref: "fixture:official", publisher: "polri", official: true };
const other = { ref: "fixture:news", publisher: "antara", official: false };
// Two-letter ids "aa", "ab", …: codes must be letters only, and none of these is a reference-only series.
const idAt = (index: number) =>
	String.fromCharCode(97 + Math.floor(index / 26)) + String.fromCharCode(97 + (index % 26));
const region = (id: string, tier: string, areaIds: string[], group = "jawa") => ({
	id,
	code: id.toUpperCase(),
	region: `Region ${id}`,
	group,
	province: `p-${id}`,
	spans: [] as string[],
	placementTier: tier,
	confidence: "high",
	aliases: [] as string[],
	areas: areaIds.map((areaId) => ({ areaId, confidence: "high" })),
	sources: [source, other],
	issues: [] as string[]
});
const area = (id: string, name: string, type = "kabupaten") => ({
	id,
	type,
	name,
	province: "p",
	aliases: [] as string[],
	variants: [] as string[]
});
const tiers = [
	...Array<string>(8).fill("common"),
	...Array<string>(10).fill("medium"),
	...Array<string>(10).fill("rare")
];
const valid = () => ({
	curation: {
		version: "2026.09.24",
		contentRev: 1,
		contentHistory: [{ contentRev: 1, version: "2026.09.24" }],
		regions: tiers.map((tier, index) => region(idAt(index), tier, [`kab-${idAt(index)}`])),
		areas: tiers.map((_, index) => area(`kab-${idAt(index)}`, `Area ${idAt(index)}`)),
		factLinks: [{ number: 1, id: "f-001", regions: ["aa"] }],
		retiredIds: [] as string[]
	},
	specials: {
		specialsVersion: "2026.09.24",
		sources: [
			{
				id: "perpol",
				title: "Perpol",
				publisher: "Polri",
				type: "peraturan",
				date: "2021-05-05",
				url: "https://x.example",
				locator: "D4",
				checkedAt: "2026-09-24" as string | null,
				originalUrl: null as string | null
			}
		],
		specials: [
			{
				id: "cd-12-amerika-serikat",
				series: "CD",
				number: "12",
				holder: "Amerika Serikat",
				holderType: "country",
				aliases: ["AS"],
				sourceName: "Amerika Serikat",
				confidence: "high",
				needsReview: false,
				sources: ["perpol"],
				validFrom: "2021-05-05",
				reviewBy: "2027-03-24"
			},
			{
				id: "cd-13-india",
				series: "CD",
				number: "13",
				holder: "India",
				holderType: "country",
				aliases: [] as string[],
				sourceName: "India",
				confidence: "high",
				needsReview: false,
				sources: ["perpol"],
				validFrom: "2021-05-05",
				reviewBy: "2027-03-24"
			}
		],
		referencePlates: [
			{
				id: "ref-ri-format",
				series: "RI",
				number: null as string | null,
				label: "RI",
				confidence: "high",
				sources: ["perpol"],
				note: "Tidak ada daftar lengkap." as string | null,
				reviewBy: "2027-03-24"
			}
		]
	},
	factsMarkdown: "1. **Draf · usulan label: legenda** — Cerita batalion.\n",
	today: "2026-09-24",
	release: false,
	revision: "fixture",
	previous: null as unknown
});
type Input = ReturnType<typeof valid>;
const failWith = (mutate: (input: Input) => void, needle: RegExp) => {
	const input = valid();
	mutate(input);
	const result = buildContent(input);
	assert.equal(result.content, null);
	assert.ok(
		result.errors.some((error) => needle.test(error)),
		result.errors.join("\n")
	);
};

test("valid curation builds the TRD bundle and strips editorial fields", () => {
	const result = buildContent(valid());
	assert.deepEqual(result.errors, []);
	const content = result.content!;
	assert.equal(content.regions.length, 28);
	assert.equal("sources" in content.regions[0], false);
	assert.equal("issues" in content.regions[0], false);
	assert.deepEqual(content.regions[0].facts, ["f-001"]);
	assert.deepEqual(content.facts[0], {
		id: "f-001",
		historyLabel: "legenda",
		text: "Cerita batalion.",
		publicationStatus: "draft",
		source: null,
		sourceCheckedAt: null
	});
	assert.equal(content.specials.length, 2);
	assert.equal(content.sourceRevision, "fixture");
});

test("contentRev must rise when content changes and history stays append-only", () => {
	const released = buildContent(valid()).content!;
	const same = valid();
	same.previous = released;
	assert.deepEqual(buildContent(same).errors, []);
	failWith((input) => {
		input.previous = released;
		input.curation.areas[0].name = "Area baru";
	}, /content changed but contentRev is still 1/);
	const bumped = valid();
	bumped.previous = released;
	bumped.curation.areas[0].name = "Area baru";
	bumped.curation.version = "2026.10.01";
	bumped.curation.contentRev = 2;
	bumped.curation.contentHistory.push({ contentRev: 2, version: "2026.10.01" });
	assert.deepEqual(buildContent(bumped).errors, []);
	failWith((input) => {
		input.previous = released;
		input.curation.contentRev = 2;
		input.curation.contentHistory = [
			{ contentRev: 1, version: "2026.09.01" },
			{ contentRev: 2, version: "2026.09.24" }
		];
	}, /contentHistory changed an existing entry/);
	failWith((input) => {
		input.curation.contentRev = 2;
	}, /contentHistory must end with contentRev 2/);
});

test("output is deterministic", () => {
	assert.equal(JSON.stringify(buildContent(valid())), JSON.stringify(buildContent(valid())));
});

const errorCases: [string, (input: Input) => void, RegExp][] = [
	[
		"duplicate region id",
		(i) => {
			i.curation.regions[1].id = "aa";
		},
		/duplicate region id: aa/
	],
	[
		"bad id format",
		(i) => {
			i.curation.areas[0].id = "Kab_AA";
			i.curation.regions[0].areas[0].areaId = "Kab_AA";
		},
		/curation/
	],
	[
		"region id shaped like a special",
		(i) => {
			i.curation.regions[0].id = "cd-1-x";
		},
		/cd-1-x/
	],
	[
		"retired id reused",
		(i) => {
			i.curation.retiredIds = ["kab-aa"];
		},
		/kab-aa/
	],
	[
		"unknown membership",
		(i) => {
			i.curation.regions[0].areas[0].areaId = "kab-ghost";
		},
		/kab-ghost/
	],
	[
		"orphan area",
		(i) => {
			i.curation.areas.push(area("kab-orphan", "Orphan"));
		},
		/kab-orphan/
	],
	[
		"alias collides with another area",
		(i) => {
			i.curation.areas[0].aliases = ["Area ab"];
		},
		/kab-aa/
	],
	[
		"variant collides after removing spaces",
		(i) => {
			i.curation.areas[0].variants = ["Areaab"];
		},
		/kab-aa/
	],
	[
		"tier too small",
		(i) => {
			i.curation.regions[0].placementTier = "rare";
		},
		/common/
	],
	[
		"too many groups with medium codes",
		(i) => {
			i.curation.regions
				.filter((r) => r.placementTier === "medium")
				.forEach((r, n) => {
					r.group = `g${n}`;
				});
			i.curation.regions.push(region("zz", "medium", ["kab-aa"], "g10"));
		},
		/medium/
	],
	[
		"province in two groups",
		(i) => {
			i.curation.regions[1].province = i.curation.regions[0].province;
			i.curation.regions[1].group = "sumatera";
		},
		/province/
	],
	[
		"high without official source",
		(i) => {
			i.curation.regions[0].sources = [other, { ...other, publisher: "kompas" }];
		},
		/AA/
	],
	[
		"high with one publisher",
		(i) => {
			i.curation.regions[0].sources = [source, { ...other, publisher: "polri" }];
		},
		/AA/
	],
	[
		"high with open issues",
		(i) => {
			i.curation.regions[0].issues = ["conflict"];
		},
		/AA/
	],
	[
		"reference-only code as region",
		(i) => {
			i.curation.regions[0].code = "CD";
		},
		/CD/
	],
	[
		"unknown fact link region",
		(i) => {
			i.curation.factLinks[0].regions = ["zz"];
		},
		/zz/
	],
	[
		"fact without link",
		(i) => {
			i.factsMarkdown += "2. **Draf · usulan label: legenda** — Lain.\n";
		},
		/fact 2/
	],
	[
		"link without fact",
		(i) => {
			i.curation.factLinks.push({ number: 9, id: "f-009", regions: [] });
		},
		/f-009/
	],
	[
		"malformed fact line",
		(i) => {
			i.factsMarkdown = "1. **Siap · label: legenda** — Teks.\n";
		},
		/Fact 1/
	],
	[
		"special id collides with region",
		(i) => {
			i.curation.regions[0].id = "cd-12-amerika-serikat";
		},
		/cd-12-amerika-serikat/
	],
	[
		"special series not CD",
		(i) => {
			i.specials.specials[0].series = "CC";
		},
		/cd-12-amerika-serikat/
	],
	[
		"special number with leading zero",
		(i) => {
			i.specials.specials[0].number = "012";
		},
		/cd-12-amerika-serikat/
	],
	[
		"duplicate high number",
		(i) => {
			i.specials.specials[1].number = "12";
			i.specials.specials[1].id = "cd-12-india";
		},
		/number 12/
	],
	[
		"duplicate high holder",
		(i) => {
			i.specials.specials[1].holder = "Amerika Serikat";
		},
		/holder Amerika Serikat/
	],
	[
		"alias collides with another holder",
		(i) => {
			i.specials.specials[1].aliases = ["A S"];
		},
		/cd-13-india/
	],
	[
		"high special without checked source",
		(i) => {
			i.specials.sources[0].checkedAt = null;
		},
		/cd-12-amerika-serikat/
	],
	[
		"unknown special source",
		(i) => {
			i.specials.specials[0].sources = ["ghost"];
		},
		/ghost/
	],
	[
		"ref id in specials",
		(i) => {
			i.specials.specials[0].id = "ref-cd-12";
		},
		/ref-cd-12/
	],
	[
		"RI reference with a number",
		(i) => {
			i.specials.referencePlates[0].number = "1";
		},
		/ref-ri-format/
	]
];
for (const [label, mutate, needle] of errorCases)
	test(`build rejects ${label}`, () => failWith(mutate, needle));

test("same base name for a kota and a kabupaten is reported, not rejected", () => {
	const input = valid();
	input.curation.areas[1] = area("kota-ab", "Area aa", "kota");
	input.curation.regions[1].areas[0].areaId = "kota-ab";
	const result = buildContent(input);
	assert.deepEqual(result.errors, []);
	assert.ok(result.reports.some((line) => line.includes("kab-aa") && line.includes("kota-ab")));
});

test("warnings become errors only under release", () => {
	const input = valid();
	input.specials.sources[0].type = "media-mengutip-instansi";
	input.specials.specials[0].reviewBy = "2026-01-01";
	const draft = buildContent(input);
	assert.equal(draft.errors.length, 0);
	assert.ok(draft.warnings.some((line) => line.includes("perpol")));
	assert.ok(draft.warnings.some((line) => line.includes("cd-12-amerika-serikat")));
	const release = buildContent({ ...input, release: true });
	assert.equal(release.content, null);
	assert.ok(release.errors.length >= 2);
});

test("parseFacts reads numbered draft items only", () => {
	assert.deepEqual(
		parseFacts(
			"## Judul\n\n3. **Draf · usulan label: diperdebatkan** — Teks panjang.\nparagraf\n"
		),
		[{ number: 3, historyLabel: "diperdebatkan", text: "Teks panjang." }]
	);
});
