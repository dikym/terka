import { expect, test } from "bun:test";
import { keyAction } from "../../src/dummy/keys";

const el = (tagName: string) => ({ tagName });

test("app shortcuts map letters outside inputs", () => {
	expect(keyAction({ key: "s", target: el("BODY") }, "app")).toBe("start");
	expect(keyAction({ key: "B", target: el("BODY") }, "app")).toBe("kilat");
	expect(keyAction({ key: "c", target: el("BODY") }, "app")).toBe("cakupan");
});

test("letters typed into a field are not shortcuts", () => {
	expect(keyAction({ key: "s", target: el("INPUT") }, "app")).toBeNull();
	expect(keyAction({ key: "z", target: el("INPUT") }, "session")).toBeNull();
	expect(keyAction({ key: "f", target: el("TEXTAREA") }, "session")).toBeNull();
	expect(
		keyAction({ key: "j", target: { tagName: "DIV", isContentEditable: true } }, "session")
	).toBeNull();
});

test("enter and escape work inside a field", () => {
	expect(keyAction({ key: "Enter", target: el("INPUT") }, "session")).toBe("confirm");
	expect(keyAction({ key: "Escape", target: el("INPUT") }, "session")).toBe("exit");
	expect(keyAction({ key: "Escape", target: el("BODY") }, "app")).toBe("back");
});

test("session choice keys follow on-screen order", () => {
	expect(
		["f", "g", "h", "j"].map((key) => keyAction({ key, target: el("BODY") }, "session"))
	).toEqual(["choose-0", "choose-1", "choose-2", "choose-3"]);
	expect(keyAction({ key: "z", target: el("BODY") }, "session")).toBe("undo");
});

test("unmapped keys do nothing", () => {
	expect(keyAction({ key: "q", target: el("BODY") }, "app")).toBeNull();
	expect(keyAction({ key: "s", target: el("BODY") }, "session")).toBeNull();
});

test("letters work again once the answer field is read-only", () => {
	expect(keyAction({ key: "z", target: { tagName: "INPUT", readOnly: true } }, "session")).toBe(
		"undo"
	);
});

test("enter on a focused button or link keeps its own action", () => {
	expect(keyAction({ key: "Enter", target: el("BUTTON") }, "session")).toBeNull();
	expect(keyAction({ key: "Enter", target: el("A") }, "app")).toBeNull();
	expect(keyAction({ key: "Enter", target: el("BODY") }, "session")).toBe("confirm");
});
