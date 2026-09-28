export type ContentMessage = {
	level: "error" | "warning" | "report";
	code: string;
	message: string;
};

export const error = (code: string, message: string): ContentMessage => ({
	level: "error",
	code,
	message
});
export const warning = (code: string, message: string): ContentMessage => ({
	level: "warning",
	code,
	message
});
export const report = (code: string, message: string): ContentMessage => ({
	level: "report",
	code,
	message
});
export const isError = (message: ContentMessage) => message.level === "error";
export const duplicates = (values: string[]) => [
	...new Set(values.filter((value, index) => values.indexOf(value) !== index))
];
