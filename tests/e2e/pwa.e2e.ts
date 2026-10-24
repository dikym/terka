import { expect, test } from "@playwright/test";
import { MAIN_ROUTES } from "../../scripts/build/routes";
import { PRIVACY_POLICY_VERSION } from "../../src/rules";

test("the web app manifest offers a Referensi shortcut", async ({ request }) => {
	const response = await request.get("/manifest.webmanifest");
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	expect(manifest).toMatchObject({
		name: "Terka",
		lang: "id",
		start_url: "/",
		display: "standalone"
	});
	expect(manifest.shortcuts).toContainEqual(
		expect.objectContaining({ name: "Referensi", url: "/referensi" })
	);
	expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
		"192x192",
		"512x512"
	]);
});

test("the privacy policy opens without JavaScript", async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto("/privasi");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kebijakan privasi");
	await expect(page.getByText(PRIVACY_POLICY_VERSION)).toBeVisible();
	await expect(page.getByText("Singapura")).toBeVisible();
	await context.close();
});

test("no page breaks the content security policy or sets a cookie", async ({ page }) => {
	await page.addInitScript(() => {
		(window as unknown as { violations: string[] }).violations = [];
		document.addEventListener("securitypolicyviolation", (event) =>
			(window as unknown as { violations: string[] }).violations.push(
				`${event.violatedDirective} ${event.blockedURI}`
			)
		);
	});
	for (const route of MAIN_ROUTES) {
		const response = await page.goto(route);
		expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
		await page.waitForLoadState("networkidle");
		expect(
			await page.evaluate(() => (window as unknown as { violations: string[] }).violations)
		).toEqual([]);
		expect(await page.evaluate(() => document.cookie)).toBe("");
	}
});
