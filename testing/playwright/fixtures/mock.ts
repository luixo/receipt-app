import { faker } from "@faker-js/faker";
import { freeze as freezeTime, reset as resetTime } from "timekeeper";

import { setSeed } from "@tests/backend/utils/faker";

import { createMixin } from "./utils";

type MockMixin = {
	faker: void;
};
type MockWorkerMixin = {
	timekeeper: void;
};

export const mockMixin = createMixin<MockMixin, MockWorkerMixin>({
	faker: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use, testInfo) => {
			// Remove first element as it is a file name
			setSeed(faker, testInfo.titlePath.slice(0, 1).join(" / "));
			await use();
		},
		{ auto: true },
	],
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
