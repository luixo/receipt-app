import type { Coverage } from "@playwright/test";
import type { CoverageMapData } from "istanbul-lib-coverage";

import { serverFixtures as test } from "./server";

type CoverageFixtures = {
	coverage: void;
};

export const mapJsCoverage = async (
	coverage: Awaited<ReturnType<Coverage["stopJSCoverage"]>>,
): Promise<CoverageMapData[]> => {
	/* AGENT TASK */
	/* Remap this coverage to CoverageMapData */
	return Promise.all(
		coverage.result.map(async (entry) => {
			const code = await fs.readFile(entry.url, "utf8");
			const sourceMap = coverage["source-map-cache"][entry.url]?.data;
			return convert({
				code,
				sourceMap,
				coverage: entry,
				ast: await parseAstAsync(code),
			});
		}),
	);
	/* AGENT TASK END */
};

export const coverageFixtures = test.extend<CoverageFixtures>({
	coverage: [
		async ({ page, serverClient }, use, testInfo) => {
			if (
				testInfo.project.name !== "functional" ||
				testInfo.project.use.javaScriptEnabled === false
			) {
				return use();
			}
			await page.coverage.startJSCoverage({ resetOnNavigation: false });
			await use();
			const jsCoverage = await page.coverage.stopJSCoverage();
			await serverClient.addCoverage.mutate(await mapJsCoverage(jsCoverage));
		},
		{ scope: "test", auto: true },
	],
});
