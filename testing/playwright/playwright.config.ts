import type { Project, ReporterDescription } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import url from "node:url";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}/`;

const COMMON_USE = {
	timezoneId: "GMT",
} as const;

const visualProjectsMatch = /.*\.visual\.spec\.ts/;
const visualProjects: Project[] = [
	{
		name: "1440-chrome",
		use: {
			...COMMON_USE,
			...devices["Desktop Chrome"],
			viewport: { width: 1440, height: 1000 },
		},
		testMatch: visualProjectsMatch,
	},

	{
		name: "1280-firefox",
		use: {
			...COMMON_USE,
			...devices["Desktop Firefox"],
			viewport: { width: 1280, height: 800 },
		},
		testMatch: visualProjectsMatch,
	},

	{
		name: "834-webkit",
		use: {
			...COMMON_USE,
			...devices["Desktop Safari"],
			viewport: { width: 834, height: 600 },
		},
		testMatch: visualProjectsMatch,
	},

	/* Test against mobile viewports. */
	{
		name: "600-chrome",
		use: {
			...COMMON_USE,
			...devices["Pixel 5"],
			viewport: { width: 600, height: 900 },
		},
		testMatch: visualProjectsMatch,
	},
	{
		name: "320-safari",
		use: {
			...COMMON_USE,
			...devices["iPhone 12"],
			viewport: { width: 320, height: 500 },
			// @see https://github.com/microsoft/playwright/issues/11812#issuecomment-1462829766
			isMobile: false,
		},
		testMatch: visualProjectsMatch,
	},
];

const functionalProject: Project = {
	name: "functional",
	use: {
		...COMMON_USE,
		...devices["Desktop Chrome"],
	},
	testMatch: /.*(?<!visual|utils)\.spec\.ts/,
};

const localDir = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.join(localDir, "../..");

export default defineConfig({
	testDir: rootDir,
	testMatch: /.*\.spec\.ts/,
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [["html", { open: "never" }] satisfies ReporterDescription],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: BASE_URL,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		// Timezone and locale on a client should differ from those on a server
		// to verify no render mismatch on hydration
		timezoneId: "America/Los_Angeles",
		locale: "ru-RU",
	},
	projects: [...visualProjects, functionalProject],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "yarn web:start",
		reuseExistingServer: !(process.env.CI || process.env.PW_SERVER),
		url: `${BASE_URL}api/ping`,
		env: {
			// Timezone and locale on server
			TZ: "UTC",
			LC_ALL: "en-US",
			NODE_ENV: "test",
			S3_BUCKET: "test-bucket",
			S3_ENDPOINT: "https://fake-endpoint.org",
		},
	},
	globalSetup: path.resolve(localDir, "./global/setup.ts"),
	globalTeardown: path.resolve(localDir, "./global/teardown.ts"),
});
