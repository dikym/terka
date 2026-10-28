import { expect, test } from "bun:test";
import { deviceIcon, deviceLabel, deviceName } from "../../../src/lib/app/device-label";

test("names the device family from the user agent", () => {
	expect(
		deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15")
	).toBe("iPhone");
	expect(deviceLabel("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("iPad");
	expect(deviceLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129")).toBe("Android");
	expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605")).toBe("Mac");
	expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129")).toBe("Windows");
	expect(deviceLabel("Mozilla/5.0 (X11; Linux x86_64) Firefox/131")).toBe("Linux");
	expect(deviceLabel("curl/8")).toBe("Browser");
});

test("names the browser and the device family for the device list", () => {
	const mac =
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129 Safari/537.36";
	const iphoneChrome =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/129 Mobile Safari/604.1";
	const iphoneSafari =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
	expect(deviceName(mac, "Mac")).toBe("Chrome di Mac");
	expect(deviceName(iphoneChrome, "iPhone")).toBe("Chrome di iPhone");
	expect(deviceName(iphoneSafari, "iPhone")).toBe("Safari di iPhone");
	expect(deviceName("Mozilla/5.0 (Windows NT 10.0) Chrome/129 Edg/129", "Windows")).toBe(
		"Edge di Windows"
	);
	expect(deviceName("Mozilla/5.0 (X11; Linux x86_64) Gecko Firefox/131", "Linux")).toBe(
		"Firefox di Linux"
	);
});

test("falls back to the stored label when the user agent says nothing", () => {
	expect(deviceName("", "iPhone")).toBe("iPhone");
	expect(deviceName("curl/8", "Browser")).toBe("Browser");
});

test("picks an icon for the kind of device", () => {
	expect(deviceIcon("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone")).toBe(
		"smartphone"
	);
	expect(deviceIcon("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", "iPad")).toBe("tablet");
	expect(
		deviceIcon("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537", "Android")
	).toBe("smartphone");
	expect(deviceIcon("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537", "Android")).toBe(
		"tablet"
	);
	expect(deviceIcon("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605", "Mac")).toBe(
		"monitor"
	);
	expect(deviceIcon("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Windows")).toBe("monitor");
	expect(deviceIcon("Mozilla/5.0 (X11; Linux x86_64)", "Linux")).toBe("monitor");
	expect(deviceIcon("curl/8", "Browser")).toBe("globe");
	expect(deviceIcon("", "iPhone")).toBe("smartphone");
});
