import { describe, expect, test } from "bun:test";
import { compactName, holderKey, normalizeName } from "../../src/core/text";

describe("name normalization (SRD 5.1, 5.3)", () => {
	test("SR-083: case, punctuation and spacing collapse", () => {
		expect(normalizeName("  MEDAN!! ")).toBe("medan");
		expect(normalizeName("Kab. Deli Serdang")).toBe("deli serdang");
		expect(normalizeName("Kotamadya Binjai")).toBe("binjai");
	});
	test("SR-096: administrative prefixes are removed only as separate words", () => {
		expect(normalizeName("Kotamobagu")).toBe("kotamobagu");
		expect(normalizeName("Kota Binjai", false)).toBe("kota binjai");
	});
	test("SR-086: compact form ignores spaces", () => {
		expect(compactName("Bukit Tinggi")).toBe(compactName("Bukittinggi"));
	});
	test("holder keys drop a leading country or embassy word only when something remains", () => {
		expect(holderKey("Kedubes Jepang")).toBe("jepang");
		expect(holderKey("Republik Ceko")).toBe("ceko");
		expect(holderKey("Republik")).toBe("republik");
		expect(holderKey("Kota Kinabalu")).toBe("kotakinabalu");
	});
});
