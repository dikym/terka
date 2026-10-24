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
