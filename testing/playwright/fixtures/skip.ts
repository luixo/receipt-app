import type { TestInfo } from "@playwright/test";
import { test } from "@playwright/test";

type Criteria = "only-smallest" | "only-biggest";

type SkipFixtures = {
	getSkippedExplanation: (
		testInfo: TestInfo,
		criteria: Criteria,
	) => string | undefined;
	skip: (testInfo: TestInfo, criteria: Criteria) => void;
};

const getSkippedExplanation = (testInfo: TestInfo, criteria: Criteria) => {
	switch (criteria) {
		case "only-smallest":
			if (testInfo.project.name !== "320-safari") {
				return "We need to run this test only once (on smallest screen)";
			}
			break;
		case "only-biggest":
			if (testInfo.project.name !== "1440-chrome") {
				return "We need to run this test only once (on biggest screen)";
			}
			break;
	}
};

export const skipFixtures = test.extend<SkipFixtures>({
	// eslint-disable-next-line no-empty-pattern
	skip: async ({}, use) =>
		use((testInfo, criteria) => {
			const skippedExplanation = getSkippedExplanation(testInfo, criteria);
			test.skip(Boolean(skippedExplanation), skippedExplanation);
		}),
});
