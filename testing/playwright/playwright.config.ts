import type { CoverageReporterOptions } from "@bgotink/playwright-coverage";
import type { Project, ReporterDescription } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import url from "node:url";

import { localSettings, serverSettings } from "~tests/frontend/consts";

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

const coverageReporterOptions: CoverageReporterOptions = {
	// Path to the root files should be resolved from, most likely your repository root
	sourceRoot: rootDir,
	// Directory in which to write coverage reports
	resultDir: path.join(localDir, "coverage"),
	include: ["apps/web/.next/static/**/*.js"],
	exclude: ["_N_E/?*", "apps/web", "**/webpack/**/*"],
	// Configure the reports to generate.
	// The value is an array of istanbul reports, with optional configuration attached.
	reports: [
		// Create an HTML view at <resultDir>/index.html
		"html",
		// Log a coverage summary at the end of the test run
		"text-summary",
		"json-summary",
		"json",
	],
	rewritePath: ({ relativePath, absolutePath }) => {
		console.log("rewrite", relativePath, absolutePath);
		// not possible to use relative paths with the standard NextJS regex replacements below
		// if they makeup the entirety of the file, i.e _N_E/?1d62. Not sure what these files do yet.
		if (/^_N_E\/\?.*$/.test(relativePath)) {
			return relativePath;
		}
		// replace next file prefix to a next.js dir, remove hash suffix
		return (absolutePath || relativePath)
			.replace("_N_E/", "apps/web/")
			.replace(/\?.*/, "");
	},
	sourceMapResolver: async ({ url: scriptUrl, mappedUrl }) => {
		if (!mappedUrl) {
			return `${scriptUrl}.map`;
		}

		const scriptPath = path.resolve(
			rootDir,
			"apps/web",
			(scriptUrl.startsWith("file:")
				? url.fileURLToPath(scriptUrl)
				: scriptUrl
			).replace(/.*_next\/(.*)/, ".next/$1"),
		);
		const scriptDir = path.dirname(scriptPath);
		const sourceMapPath = path.resolve(scriptDir, mappedUrl);
		return url.pathToFileURL(sourceMapPath).toString();
	},
};

export default defineConfig({
	testDir: rootDir,
	testMatch: /.*\.spec\.ts/,
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	// We're brave enough to believe we don't have flaky tests
	failOnFlakyTests: true,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [
		process.env.CI ? 'blob' : ["html", { open: "never" }] satisfies ReporterDescription,
		// Set PLAYWRIGHT_SKIP_COVERAGE variable to a truthy value to skip generating coverage
		// e.g. in Playwright VSCode extension
		process.env.PLAYWRIGHT_SKIP_COVERAGE
			? undefined
			: ([
					"./coverage-reporter",
					coverageReporterOptions,
			  ] satisfies ReporterDescription),
	].filter((x): x is NonNullable<typeof x> => Boolean(x)),
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: BASE_URL,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		timezoneId: localSettings.timezone,
		locale: localSettings.locale,
	},
	projects: [...visualProjects, functionalProject],
	snapshotPathTemplate:
		"../../{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
	/* Run your local dev server before starting the tests */
	webServer: {
		command: "yarn web:start",
		reuseExistingServer: !(process.env.CI || process.env.PW_SERVER),
		url: `${BASE_URL}api/ping`,
		env: {
			// Timezone and locale on server
			TZ: serverSettings.timezone,
			LC_ALL: serverSettings.locale,
			S3_BUCKET: "test-bucket",
			S3_ENDPOINT: "https://fake-endpoint.org",
			PORT: PORT.toString(),
		},
	},
	globalSetup: path.resolve(localDir, "./global/setup.ts"),
	globalTeardown: path.resolve(localDir, "./global/teardown.ts"),
});
