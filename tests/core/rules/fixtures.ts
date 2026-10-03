import type { Area, Bundle, Region, Special } from "../../../src/core/content/schema";

export const WITA = "Asia/Makassar";
// Monday 21 September 2026, 04:00 WITA.
export const NOW = Date.parse("2026-09-21T04:00:00+08:00");

const H = "high" as const;
const M = "medium" as const;
const area = (id: string, name: string, province: string, extra: Partial<Area> = {}): Area => ({
	id,
	type: id.startsWith("kota-") ? "kota" : "kabupaten",
	name,
	province,
	aliases: [],
	variants: [],
	...extra
});
const region = (
	id: string,
	group: string,
	province: string,
	members: [string, "high" | "medium"][],
	extra: Partial<Region> = {}
): Region => ({
	id,
	code: id.toUpperCase(),
	region: `Wilayah ${id.toUpperCase()}`,
	group,
	province,
	spans: [],
	placementTier: "common",
	confidence: "high",
	aliases: [],
	areas: members.map(([areaId, confidence]) => ({ areaId, confidence })),
	facts: [],
	...extra
});
const special = (number: string, holder: string, extra: Partial<Special> = {}): Special => ({
	id: `cd-${number}-${holder.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
	series: "CD",
	number,
	holder,
	holderType: "country",
	aliases: [],
	sourceName: holder,
	confidence: "high",
	needsReview: false,
	sources: ["perpol"],
	validFrom: "2021-05-05",
	reviewBy: "2027-03-24",
	...extra
});

// Covers: shared area (Tangerang), kota/kabupaten twins (Bima), exclusive and shared provinces,
// medium membership (Langkat), aliases, variants, old spellings, and CD neighbours 48/49/50.
export function ruleBundle(): Bundle {
	return {
		version: "2026.09.29",
		contentRev: 1,
		contentHistory: [{ contentRev: 1, version: "2026.09.29" }],
		regions: [
			region("bk", "sumatera", "sumatera-utara", [
				["kota-medan", H],
				["kota-binjai", H],
				["kab-deli-serdang", H],
				["kota-tebing-tinggi", H],
				["kota-pematangsiantar", H],
				["kab-langkat", M]
			]),
			region("bb", "sumatera", "sumatera-utara", [
				["kota-sibolga", H],
				["kab-tapanuli-utara", H]
			]),
			region("ba", "sumatera", "sumatera-barat", [
				["kota-bukittinggi", H],
				["kota-padang", H]
			]),
			region("bm", "sumatera", "riau", [["kota-pekanbaru", H]]),
			region("bp", "sumatera", "kepulauan-riau", [
				["kota-tanjungpinang", H],
				["kota-batam", H]
			]),
			region("be", "sumatera", "lampung", [
				["kota-bandar-lampung", H],
				["kab-lampung-selatan", H]
			]),
			region("bd", "sumatera", "bengkulu", [["kota-bengkulu", H]]),
			region("a", "jawa", "banten", [
				["kota-serang", H],
				["kab-tangerang", H]
			]),
			region(
				"b",
				"jawa",
				"jakarta",
				[
					["kota-jakarta-pusat", H],
					["kab-tangerang", H]
				],
				{ spans: ["banten"] }
			),
			region("ab", "jawa", "yogyakarta", [
				["kota-yogyakarta", H],
				["kab-sleman", H]
			]),
			region("p", "jawa", "jawa-timur", [["kab-jember", H]]),
			region("r", "jawa", "jawa-tengah", [["kab-cilacap", H]]),
			region("dk", "bali-nusa-tenggara", "bali", [
				["kota-denpasar", H],
				["kab-badung", H],
				["kab-gianyar", H]
			]),
			region("dr", "bali-nusa-tenggara", "nusa-tenggara-barat", [
				["kota-mataram", H],
				["kab-lombok-barat", H]
			]),
			region("ea", "bali-nusa-tenggara", "nusa-tenggara-barat", [
				["kota-bima", H],
				["kab-bima", H],
				["kab-sumbawa", H]
			]),
			region("db", "sulawesi", "sulawesi-utara", [["kota-kotamobagu", H]])
		],
		areas: [
			area("kota-medan", "Medan", "sumatera-utara"),
			area("kota-binjai", "Binjai", "sumatera-utara", { variants: ["Binjay"] }),
			area("kab-deli-serdang", "Deli Serdang", "sumatera-utara"),
			area("kota-tebing-tinggi", "Tebing Tinggi", "sumatera-utara"),
			area("kota-pematangsiantar", "Pematangsiantar", "sumatera-utara"),
			area("kab-langkat", "Langkat", "sumatera-utara"),
			area("kota-sibolga", "Sibolga", "sumatera-utara"),
			area("kab-tapanuli-utara", "Tapanuli Utara", "sumatera-utara"),
			area("kota-bukittinggi", "Bukittinggi", "sumatera-barat"),
			area("kota-padang", "Padang", "sumatera-barat"),
			area("kota-pekanbaru", "Pekanbaru", "riau", { variants: ["Pekan Baru"] }),
			area("kota-tanjungpinang", "Tanjungpinang", "kepulauan-riau"),
			area("kota-batam", "Batam", "kepulauan-riau"),
			area("kota-bandar-lampung", "Bandar Lampung", "lampung"),
			area("kab-lampung-selatan", "Lampung Selatan", "lampung"),
			area("kota-bengkulu", "Bengkulu", "bengkulu"),
			area("kota-serang", "Serang", "banten"),
			area("kab-tangerang", "Tangerang", "banten"),
			area("kota-jakarta-pusat", "Jakarta Pusat", "jakarta"),
			area("kota-yogyakarta", "Yogyakarta", "yogyakarta", { aliases: ["Jogja"] }),
			area("kab-sleman", "Sleman", "yogyakarta"),
			area("kab-jember", "Jember", "jawa-timur"),
			area("kab-cilacap", "Cilacap", "jawa-tengah"),
			area("kota-denpasar", "Denpasar", "bali"),
			area("kab-badung", "Badung", "bali"),
			area("kab-gianyar", "Gianyar", "bali"),
			area("kota-mataram", "Mataram", "nusa-tenggara-barat"),
			area("kab-lombok-barat", "Lombok Barat", "nusa-tenggara-barat"),
			area("kota-bima", "Bima", "nusa-tenggara-barat"),
			area("kab-bima", "Bima", "nusa-tenggara-barat"),
			area("kab-sumbawa", "Sumbawa", "nusa-tenggara-barat"),
			area("kota-kotamobagu", "Kotamobagu", "sulawesi-utara")
		],
		facts: [],
		sources: [],
		specials: [
			special("12", "Amerika Serikat", {
				aliases: ["AS", "USA", "United States", "Amerika"]
			}),
			special("17", "Vatikan", { aliases: ["Takhta Suci", "Holy See"] }),
			special("20", "Irak", { aliases: ["Iraq"] }),
			special("45", "Iran"),
			special("48", "Turki", { aliases: ["Turkiye"] }),
			special("49", "Jepang", { aliases: ["Japan"] }),
			special("50", "Bulgaria"),
			special("58", "UNDP", {
				holderType: "organization",
				aliases: ["United Nations Development Programme"]
			}),
			special("119", "Contohland", { confidence: "medium" })
		],
		referencePlates: []
	};
}
