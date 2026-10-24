import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { trainingSetHash } from "../../../src/core/optimizer/hash";

const one = "00000000-0000-0000-0000-000000000001";
const two = "00000000-0000-0000-0000-000000000002";
const bytes = (id: string) => Buffer.from(id.replaceAll("-", ""), "hex");

describe("trainingSetHash", () => {
	test("hashes the sorted ids as 16 bytes each", async () => {
		const expected = createHash("sha256")
			.update(Buffer.concat([bytes(one), bytes(two)]))
			.digest("hex");
		expect(await trainingSetHash([two, one])).toBe(expected);
	});

	test("does not depend on input order and gives 32 bytes of hex", async () => {
		const hash = await trainingSetHash([one, two]);
		expect(hash).toBe(await trainingSetHash([two, one]));
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});
});
