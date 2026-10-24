import { defineConfig, devices } from "@playwright/test";

// Runs against the static export in out/ (bun run build:local first).
export default defineConfig({
	testDir: "tests/e2e",
	testMatch: "**/*.e2e.ts",
	// One worker: the test server holds the service worker version as shared state.
	workers: 1,
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	timeout: 120_000,
	use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "webkit", use: { ...devices["iPhone 13"] } }
	],
	webServer: {
		command: "bun tests/e2e/support/serve.ts",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI
	}
});
