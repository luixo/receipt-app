import { mapValues } from "remeda";
import { z } from "zod";

export const temporalClasses = {
	plainTime: Temporal.PlainTime,
	plainDate: Temporal.PlainDate,
	plainDateTime: Temporal.PlainDateTime,
	zonedDateTime: Temporal.ZonedDateTime,
} as const;
export const temporalSchemas = mapValues(temporalClasses, (value) =>
	z.instanceof(value, {
		error: `Input not instance of ${value.name}`,
	}),
) as {
	[K in keyof TemporalMapping]: z.ZodCustom<
		InstanceType<(typeof temporalClasses)[K]>,
		InstanceType<(typeof temporalClasses)[K]>
	>;
};

export type TemporalMapping = {
	[K in keyof typeof temporalClasses]: InstanceType<
		(typeof temporalClasses)[K]
	>;
};
