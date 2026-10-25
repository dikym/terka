import type { Page } from "@playwright/test";

// The first visit installs the worker; the next load is the first one it controls.
export async function installed(page: Page) {
	await page.goto("/beranda");
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

export const pageErrors = (page: Page) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	return errors;
};
