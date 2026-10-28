import type { Page } from "@playwright/test";

/** Opens a route and waits until its main content has rendered. */
export async function opened(page: Page, route: string) {
	await page.goto(route);
	await page.locator("main").waitFor();
}
