import { describe, expect, test } from "bun:test";
import { isInAppBrowser } from "../../../src/lib/auth/browsers";

const agents = {
	instagram:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.40.92",
	facebook:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.98]",
	messenger:
		"Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/460.0.0.48.109;] Messenger",
	tiktok: "Mozilla/5.0 (Linux; Android 13; RMX3511) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 musical_ly_2023405030 BytedanceWebview/d8a21c6",
	line: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0",
	chromeAndroid:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
	safariIos:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
};

describe("browsers inside other apps", () => {
	test("Instagram, Facebook, Messenger, TikTok and LINE are in-app browsers", () => {
		for (const name of ["instagram", "facebook", "messenger", "tiktok", "line"] as const)
			expect([name, isInAppBrowser(agents[name])]).toEqual([name, true]);
	});
	test("Chrome on Android and Safari on iOS are not", () => {
		expect(isInAppBrowser(agents.chromeAndroid)).toBe(false);
		expect(isInAppBrowser(agents.safariIos)).toBe(false);
	});
});
