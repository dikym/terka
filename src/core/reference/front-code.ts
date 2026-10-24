// The first one or two letters of a plate; numbers and the back letters are never kept.
const FRONT_CODE = /^\s*([A-Za-z]{1,2})(?=[\s\d.-]|$)/;

export const frontCode = (input: string): string | null =>
	input.match(FRONT_CODE)?.[1].toUpperCase() ?? null;

export const SPECIAL_SERIES = new Set(["RI", "CD", "CC", "CH"]);
