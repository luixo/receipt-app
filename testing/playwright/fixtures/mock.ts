import { Faker, en } from "@faker-js/faker";
import { test } from "@playwright/test";
import timekeeper from "timekeeper";

import { setSeed } from "~tests/utils/faker";

type MockFixtures = {
	faker: Faker;
};
type MockWorkerFixtures = {
	timekeeper: void;
};

export const mockFixtures = test.extend<MockFixtures, MockWorkerFixtures>({
	// eslint-disable-next-line no-empty-pattern
	faker: async ({}, use, testInfo) => {
		const localFaker = new Faker({ locale: en });
		// Remove first element as it is a file name
		setSeed(localFaker, testInfo.titlePath.slice(1).join(" / "));
		await use(localFaker);
	},
	timekeeper: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			timekeeper.freeze(new Date("2020-01-01"));
			await use();
			timekeeper.reset();
		},
		{ auto: true, scope: "worker" },
	],
});
