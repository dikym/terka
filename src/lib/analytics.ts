import type { BeforeSendEvent } from "@vercel/analytics/next";

// Only the path leaves the page; /auth/callback?code=… would otherwise send a login code.
export const pageViewUrl = (url: string) => {
	const parsed = new URL(url);
	return `${parsed.origin}${parsed.pathname}`;
};

export const beforeSend = (event: BeforeSendEvent): BeforeSendEvent => ({
	...event,
	url: pageViewUrl(event.url)
});
