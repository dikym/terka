import type { ContentDraft } from "../../../src/core/content/draft";
import type { ContentMessage } from "../../../src/core/content/messages";

const letters = "abcdefghijklmnopqrstuvwxyz";
export const idAt = (index: number) => letters[Math.floor(index / 26)] + letters[index % 26];
const tiers = [
	...Array<"common">(8).fill("common"),
	...Array<"medium">(10).fill("medium"),
	...Array<"rare">(10).fill("rare")
];

// 28 one-area codes in one group (tiers 8/10/10), one fact, two CD entries and one RI format entry.
export function validDraft(): ContentDraft {
	return {
		curation: {
			version: "2026.09.28",
			contentRev: 1,
			contentHistory: [{ contentRev: 1, version: "2026.09.28" }],
			groups: [{ id: "island-a", name: "Pulau A" }],
			regions: tiers.map((placementTier, index) => ({
				id: idAt(index),
				code: idAt(index).toUpperCase(),
				region: `Wilayah ${idAt(index)}`,
				group: "island-a",
				province: `province-${idAt(index)}`,
				spans: [],
				placementTier,
				confidence: "high" as const,
				aliases: [],
				areas: [{ areaId: `kab-${idAt(index)}`, confidence: "high" as const }],
				sources: [
					{ ref: "https://polri.example", publisher: "polri", official: true },
					{ ref: "https://antara.example", publisher: "antara", official: false }
				],
				issues: []
			})),
			areas: tiers.map((_, index) => ({
				id: `kab-${idAt(index)}`,
				type: "kabupaten" as const,
				name: `Daerah ${idAt(index)}`,
				province: `province-${idAt(index)}`,
				aliases: [],
				variants: []
			})),
			facts: [{ number: 1, id: "f-001", regions: ["aa"] }],
			retiredIds: []
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
					checkedAt: "2026-09-24",
					originalUrl: null
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
					aliases: [],
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
					number: null,
					label: "Presiden; format RI + nomor urut",
					confidence: "high",
					sources: ["perpol"],
					note: "Tidak ada daftar lengkap.",
					reviewBy: "2027-03-24"
				}
			]
		},
		facts: [
			{
				number: 1,
				line: 1,
				historyLabel: "legenda",
				publicationStatus: "draft",
				text: "Cerita batalion."
			}
		]
	};
}

export const errorCodes = (messages: ContentMessage[]) =>
	messages.filter((message) => message.level === "error").map((message) => message.code);
