import { expect, test } from "bun:test";
import { deviceLabel } from "../../../src/lib/app/device-label";

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
