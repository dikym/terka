// Google refuses OAuth inside these apps' embedded browsers (disallowed_useragent).
export const IN_APP_BROWSERS: readonly RegExp[] = [
	/Instagram/i,
	/FBAN|FBAV|FB_IAB/,
	/Messenger|FBMS/i,
	/musical_ly|TikTok|BytedanceWebview/i,
	/\bLine\//
];

export const isInAppBrowser = (userAgent: string) =>
	IN_APP_BROWSERS.some((pattern) => pattern.test(userAgent));
