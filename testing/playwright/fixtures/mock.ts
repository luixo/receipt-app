import { Faker, en } from "@faker-js/faker";
import { freeze as freezeTime, reset as resetTime } from "timekeeper";

import { setSeed } from "~tests/utils";

import { createMixin } from "./utils";

type MockMixin = {
	faker: Faker;
};
type MockWorkerMixin = {
	timekeeper: void;
};

export const mockMixin = createMixin<MockMixin, MockWorkerMixin>({
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
			freezeTime(new Date("2020-01-01"));
			await use();
			resetTime();
		},
		{ auto: true, scope: "worker" },
	],
});
