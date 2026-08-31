import { Faker } from "@faker-js/faker";
import { createHash } from "node:crypto";
import { mapValues } from "remeda";

import type { TemporalMapping, TemporalType } from "~utils/date";
import { fromDate, temporalSchemas, toDate } from "~utils/date";

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
				fromDate[key](
					this.faker.date.between({
						from: toDate[key](from as never),
						to: toDate[key](to as never),
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
				fromDate[key](
					this.faker.date.recent({
						days,
						refDate: refDate && toDate[key](refDate as never),
					}),
				),
	) as {
		[K in TemporalType]: (options?: {
			days?: number;
			refDate?: TemporalMapping[K];
		}) => TemporalMapping[K];
	};
}

// oxlint-disable-next-line max-classes-per-file
export class ExtendedFaker extends Faker {
	readonly temporal = new TemporalModule(this);
}

const HASH_MAGNITUDE = 10 ** 30;

export const setSeed = (instance: Faker, input: string) => {
	instance.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};
