// eslint-disable-next-line max-classes-per-file
import { Faker, en } from "@faker-js/faker";
import { test } from "@playwright/test";
import { mapValues } from "remeda";
import timekeeper from "timekeeper";

import { setSeed } from "~tests/utils/faker";
import type { TemporalMapping, TemporalType } from "~utils/date";
import { createTemporal, temporalSchemas } from "~utils/date";

class TemporalModule {
	constructor(faker: Faker) {
		this.faker = faker;
	}
	faker;
	between = mapValues(
		temporalSchemas,
		(_value, key) =>
			<K extends TemporalType>({
				from,
				to,
			}: {
				from: TemporalMapping[K];
				to: TemporalMapping[K];
			}) =>
				createTemporal(
					key,
					this.faker.date.between({
						from: from.value,
						to: to.value,
					}),
				),
	) as {
		[K in TemporalType]: (options: {
			from: TemporalMapping[K];
			to: TemporalMapping[K];
		}) => TemporalMapping[K];
	};

	recent = mapValues(
		temporalSchemas,
		(_value, key) =>
			<K extends TemporalType>({
				days,
				refDate,
			}: {
				days?: number;
				refDate?: TemporalMapping[K];
			} = {}) =>
				createTemporal(
					key,
					this.faker.date.recent({
						days,
						refDate: refDate && refDate.value,
					}),
				),
	) as {
		[K in TemporalType]: (options?: {
			days?: number;
			refDate?: TemporalMapping[K];
		}) => TemporalMapping[K];
	};
}

export class ExtendedFaker extends Faker {
	readonly temporal = new TemporalModule(this);
}
type MockFixtures = {
	faker: ExtendedFaker;
};
type MockWorkerFixtures = {
	timekeeper: void;
};

export const mockFixtures = test.extend<MockFixtures, MockWorkerFixtures>({
	faker: async ({}, use, testInfo) => {
		const localFaker = new ExtendedFaker({ locale: en });
		// Remove first element as it is a file name
		setSeed(localFaker, testInfo.titlePath.slice(1).join(" / "));
		await use(localFaker);
	},
	timekeeper: [
		async ({}, use) => {
			// eslint-disable-next-line no-restricted-syntax
			timekeeper.freeze(new Date("2020-01-01"));
			await use();
			timekeeper.reset();
		},
		{ auto: true, scope: "worker" },
	],
});
