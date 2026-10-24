import { expect, test } from "bun:test";
import { searchDummy } from "../../src/dummy/reference";

test("search routes each query to the frame it shows", () => {
	expect(searchDummy("")).toEqual({ kind: "list" });
	expect(searchDummy(" bk ")).toEqual({ kind: "region", code: "BK" });
	expect(searchDummy("CD 49 07")).toEqual({ kind: "special", number: "49" });
	expect(searchDummy("cd 4")).toEqual({ kind: "suggest", query: "cd 4" });
	expect(searchDummy("CC 12 10")).toEqual({ kind: "cc" });
	expect(searchDummy("RI 1")).toEqual({ kind: "ri" });
	expect(searchDummy("qwrty")).toEqual({ kind: "none", query: "qwrty" });
});

test("a diplomat number not on the list finds nothing", () => {
	expect(searchDummy("CD 46")).toEqual({ kind: "none", query: "CD 46" });
});

test("a name prefix suggests instead of failing", () => {
	expect(searchDummy("medan").kind).toBe("suggest");
	expect(searchDummy("sum").kind).toBe("suggest");
});

test("two letters that are no code and no name find nothing", () => {
	expect(searchDummy("QQ")).toEqual({ kind: "none", query: "QQ" });
});

test("a full plate reads its front code", () => {
	expect(searchDummy("BK 1234 AB")).toEqual({ kind: "region", code: "BK" });
	expect(searchDummy("b 1 rfs")).toEqual({ kind: "region", code: "B" });
});
