import { expect, test } from "bun:test";
import { isFinishKey } from "../../src/lib/platform";

const press = (
	key: string,
	modifiers: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>> = {}
) => ({
	key,
	metaKey: false,
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	...modifiers
});

test("command and Enter finishes a list on an Apple device, control does not", () => {
	expect(isFinishKey(press("Enter", { metaKey: true }), true)).toBe(true);
	expect(isFinishKey(press("Enter", { ctrlKey: true }), true)).toBe(false);
});

test("control and Enter finishes a list elsewhere, the windows key does not", () => {
	expect(isFinishKey(press("Enter", { ctrlKey: true }), false)).toBe(true);
	expect(isFinishKey(press("Enter", { metaKey: true }), false)).toBe(false);
});

test("a plain Enter or another key never finishes a list", () => {
	for (const apple of [true, false]) {
		expect(isFinishKey(press("Enter"), apple)).toBe(false);
		expect(isFinishKey(press("a", { metaKey: true, ctrlKey: true }), apple)).toBe(false);
	}
});

test("an extra modifier keeps the combination from finishing", () => {
	expect(isFinishKey(press("Enter", { metaKey: true, altKey: true }), true)).toBe(false);
	expect(isFinishKey(press("Enter", { ctrlKey: true, shiftKey: true }), false)).toBe(false);
});
