import type { TestInfo } from "@playwright/test";
import { test } from "@playwright/test";

type Criteria = "only-smallest";

type SkipFixtures = {
	skip: (testInfo: TestInfo, criteria: Criteria) => void;
};

export const skipFixtures = test.extend<SkipFixtures>({
	// eslint-disable-next-line no-empty-pattern
	skip: async ({}, use) =>
		use((testInfo, criteria) => {
			switch (criteria) {
				// We want this to blow up in case we add more cases
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				case "only-smallest":
					test.skip(
						testInfo.project.name !== "320-safari",
						"We need to run this test only once (on smallest screen)",
					);
					break;
			}
		}),
});
