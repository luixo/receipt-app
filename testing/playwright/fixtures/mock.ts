import { Faker, en } from "@faker-js/faker";
import { test } from "@playwright/test";
import timekeeper from "timekeeper";

import { addAttachment } from "~tests/frontend/utils/test-info";
import { setSeed } from "~tests/utils/faker";
import { freezeTemporal } from "~tests/utils/temporal-freeze";

type MockFixtures = {
	faker: Faker;
	reportFakerData: void;
};
type MockWorkerFixtures = {
	timekeeper: void;
};

export const mockFixtures = test.extend<MockFixtures, MockWorkerFixtures>({
	faker: async ({}, use, testInfo) => {
		const localFaker = new Faker({ locale: [en] });
		// Remove first element as it is a file name
		setSeed(localFaker, testInfo.titlePath.slice(1).join(" / "));
		await use(localFaker);
	},
	reportFakerData: [
		async ({ faker }, use, testInfo) => {
			await use();
			if (testInfo.status !== testInfo.expectedStatus) {
				await addAttachment(testInfo, "faker-data", { seedId: faker.seed() });
			}
		},
		{ auto: true },
	],
	timekeeper: [
		async ({}, use) => {
			// oxlint-disable-next-line eslint-js/no-restricted-syntax
			timekeeper.freeze(new Date("2020-01-01"));
			freezeTemporal(Temporal.PlainDateTime.from("2020-01-01T00:00:00"));
			await use();
			timekeeper.reset();
		},
		{ auto: true, scope: "worker" },
	],
});
