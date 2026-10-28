import type { Page } from "@playwright/test";

/** Opens a route and waits until it has settled; signed out, the account page hands over to sign-in. */
export async function opened(page: Page, route: string) {
	await page.goto(route);
	if (route === "/statistik/akun") await page.waitForURL(/\/masuk\?/);
	await page.locator("main").waitFor();
}
