const FAMILIES: [RegExp, string][] = [
	[/iPhone/, "iPhone"],
	[/iPad/, "iPad"],
	[/Android/, "Android"],
	[/Windows/, "Windows"],
	[/Macintosh|Mac OS X/, "Mac"],
	[/Linux|X11/, "Linux"]
];

// A short label the account screen can show; the full user agent goes to `platform`.
export const deviceLabel = (userAgent: string) =>
	FAMILIES.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Browser";

const BROWSERS: [RegExp, string][] = [
	[/Edg(?:A|iOS)?\//, "Edge"],
	[/OPR\/|OPiOS/, "Opera"],
	[/Firefox|FxiOS/, "Firefox"],
	[/Chrome|CriOS/, "Chrome"],
	[/Safari/, "Safari"]
];

const familyOf = (userAgent: string, label: string) =>
	FAMILIES.find(([pattern]) => pattern.test(userAgent))?.[1] ?? label;

/** "Chrome di Mac" for the device list; falls back to the stored label when the browser is unknown. */
export function deviceName(userAgent: string, label: string): string {
	const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
	const family = familyOf(userAgent, label);
	return browser ? `${browser} di ${family}` : family;
}

export type DeviceIcon = "smartphone" | "tablet" | "monitor" | "globe";

/**
 * A user agent cannot tell a laptop from a desktop, so every computer gets the monitor. An Android
 * user agent without "Mobile" is a tablet; an unknown device gets the globe.
 */
export function deviceIcon(userAgent: string, label: string): DeviceIcon {
	switch (familyOf(userAgent, label)) {
		case "iPhone":
			return "smartphone";
		case "iPad":
			return "tablet";
		case "Android":
			return /Mobile/.test(userAgent) ? "smartphone" : "tablet";
		case "Mac":
		case "Windows":
		case "Linux":
			return "monitor";
		default:
			return "globe";
	}
}
