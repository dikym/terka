export type KeyAction =
	| "start"
	| "kilat"
	| "cakupan"
	| "search"
	| "confirm"
	| "back"
	| "choose-0"
	| "choose-1"
	| "choose-2"
	| "choose-3"
	| "undo"
	| "exit";

export type KeyScope = "app" | "session";

type KeyInput = {
	key: string;
	target: { tagName: string; isContentEditable?: boolean; readOnly?: boolean } | null;
};

const APP_LETTERS: Record<string, KeyAction> = {
	s: "start",
	b: "kilat",
	c: "cakupan",
	"/": "search"
};
const SESSION_LETTERS: Record<string, KeyAction> = {
	f: "choose-0",
	g: "choose-1",
	h: "choose-2",
	j: "choose-3",
	z: "undo"
};

const typing = (target: KeyInput["target"]) =>
	!!target &&
	!target.readOnly &&
	(["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || !!target.isContentEditable);

export function keyAction({ key, target }: KeyInput, scope: KeyScope): KeyAction | null {
	if (key === "Enter")
		return target && ["BUTTON", "A"].includes(target.tagName) ? null : "confirm";
	if (key === "Escape") return scope === "session" ? "exit" : "back";
	if (typing(target)) return null;
	const letters = scope === "session" ? SESSION_LETTERS : APP_LETTERS;
	return letters[key.toLowerCase()] ?? null;
}
