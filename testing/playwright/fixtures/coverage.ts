import fs from "node:fs/promises";
import path from "node:path";


import { serverFixtures as test } from "./server";

const rootDir = path.join(import.meta.dirname, "../../../");
const playwrightDir = path.join(rootDir, "testing/playwright");

type CoverageFixtures = {
	coverage: void;
};

const clientCoverageDir = path.join(playwrightDir, "coverage/data/client");

export const coverageFixtures = test.extend<CoverageFixtures>({
	coverage: [
		async ({ page, serverClient, javaScriptEnabled }, use, testInfo) => {
			if (
				testInfo.project.name !== "functional" ||
				!javaScriptEnabled ||
				!process.env.COVERAGE
			) {
				return use();
			}
			await page.coverage.startJSCoverage({ resetOnNavigation: false });
			await use();
			const jsCoverage = await page.coverage.stopJSCoverage();
			await fs.mkdir(clientCoverageDir, { recursive: true });
			await fs.writeFile(
				path.join(
					playwrightDir,
					"coverage/data/client",
					`${testInfo.testId}.json`,
				),
				JSON.stringify(jsCoverage, null, 4),
			);
			await serverClient.addCoverage.mutate(jsCoverage);
		},
		{ scope: "test", auto: true },
	],
});
