import type { DateTimeDuration } from "@internationalized/date";
import { entries, isObjectType, mapValues } from "remeda";
import type { $brand } from "zod/v4";
import { z } from "zod/v4";

import type { Locale } from "~app/utils/locale";

type TYear = `${number}${number}${number}${number}`;
type TMonth = `${number}${number}`;
type TDay = `${number}${number}`;
type THours = `${number}${number}`;
type TMinutes = `${number}${number}`;
type TSeconds = `${number}${number}`;
type TMilliseconds = `${number}${number}${number}`;
type TPlainTime = `${THours}:${TMinutes}:${TSeconds}.${TMilliseconds}`;
type TPlainDate = `${TYear}-${TMonth}-${TDay}`;
type TPlainDateTime = `${TPlainDate}T${TPlainTime}`;
type TZonedTime = `${TPlainTime}[${string}]`;
type TZonedDateTime = `${TPlainDateTime}[${string}]`;

/* eslint-disable no-restricted-syntax */
const getTemporalSchema = <T extends TemporalType>(type: T) =>
	z.object({ type: z.literal(type), value: z.date() });
type GenericSchema<T extends string> = Partial<$brand<T>> & {
	type: T;
	value: Date;
};
export const temporalSchemas = {
	plainTime: z
		.custom<GenericSchema<"plainTime">>()
		.pipe(getTemporalSchema("plainTime")),
	plainDate: z
		.custom<GenericSchema<"plainDate">>()
		.pipe(getTemporalSchema("plainDate")),
	plainDateTime: z
		.custom<GenericSchema<"plainDateTime">>()
		.pipe(getTemporalSchema("plainDateTime")),
	zonedTime: z
		.custom<GenericSchema<"zonedTime">>()
		.pipe(getTemporalSchema("zonedTime")),
	zonedDateTime: z
		.custom<GenericSchema<"zonedDateTime">>()
		.pipe(getTemporalSchema("zonedDateTime")),
} satisfies Record<TemporalType, z.ZodType>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Temporal {
	export type PlainTime = z.infer<typeof temporalSchemas.plainTime>;
	export type PlainDate = z.infer<typeof temporalSchemas.plainDate>;
	export type PlainDateTime = z.infer<typeof temporalSchemas.plainDateTime>;
	export type ZonedTime = z.infer<typeof temporalSchemas.zonedTime>;
	export type ZonedDateTime = z.infer<typeof temporalSchemas.zonedDateTime>;
}
export type TemporalMapping = {
	plainTime: Temporal.PlainTime;
	plainDate: Temporal.PlainDate;
	plainDateTime: Temporal.PlainDateTime;
	zonedTime: Temporal.ZonedTime;
	zonedDateTime: Temporal.ZonedDateTime;
};
export const isTemporalObject = <T extends TemporalType>(
	input: unknown,
): input is TemporalMapping[T] =>
	Boolean(
		isObjectType(input) &&
			"type" in input &&
			typeof input.type === "string" &&
			input.type in temporalSchemas,
	);
export type TemporalType = keyof TemporalMapping;

export type TemporalInputMapping = {
	plainTime: TPlainTime;
	plainDate: TPlainDate;
	plainDateTime: TPlainDateTime;
	zonedTime: TZonedTime;
	zonedDateTime: TZonedDateTime;
};

const MockTemporal = {};
export const createTemporal = <T extends TemporalType>(
	type: T,
	value: Date,
): TemporalMapping[T] => {
	const obj = Object.create(MockTemporal);
	obj.type = type;
	obj.value = value;
	return obj as unknown as TemporalMapping[T];
};

export const getOffsettedDate = (date: Date) =>
	new Date(date.valueOf() - date.getTimezoneOffset() * 1000 * 60);
export const getNow = mapValues(
	temporalSchemas,
	(_value, key) => () => createTemporal(key, new Date()),
) as {
	[K in TemporalType]: () => TemporalMapping[K];
};
export const formatters: {
	[K in TemporalType]: (
		input: TemporalMapping[K],
		locale: Locale,
		options?: Intl.DateTimeFormatOptions,
	) => string;
} = {
	plainTime: (input, locale, options) =>
		input.value.toLocaleTimeString(locale, options),
	plainDate: (input, locale, options) =>
		input.value.toLocaleDateString(locale, options),
	plainDateTime: (input, locale, options) =>
		input.value.toLocaleString(locale, options),
	zonedTime: (input, locale, options) =>
		input.value.toLocaleTimeString(locale, options),
	zonedDateTime: (input, locale, options) =>
		input.value.toLocaleString(locale, options),
};
export const parsers = mapValues(
	temporalSchemas,
	(_value, key) => (input: TemporalInputMapping[typeof key]) =>
		createTemporal<typeof key>(key, new Date(input.replace(/\[.*\]/, "Z"))),
) as {
	[K in TemporalType]: (input: TemporalInputMapping[K]) => TemporalMapping[K];
};
const deserializeRegexes = {
	plainDate: /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
	plainTime: /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
	plainDateTime:
		/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
	zonedTime:
		/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.[0-9]{1,6})?(?:Z|-0[1-9]|-1\d|-2[0-3]|-00:?(?:0[1-9]|[1-5]\d)|\+[01]\d|\+2[0-3])(?:|:?[0-5]\d)$/,
	zonedDateTime:
		/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.[0-9]{1,6})?(?:Z|-0[1-9]|-1\d|-2[0-3]|-00:?(?:0[1-9]|[1-5]\d)|\+[01]\d|\+2[0-3])(?:|:?[0-5]\d)$/,
} satisfies Record<TemporalType, RegExp>;
export const deserialize = <K extends TemporalType>(
	input: string,
): TemporalMapping[K] | undefined => {
	const regexTypeMatch = entries(deserializeRegexes).find(([, regex]) =>
		regex.test(input),
	);
	if (regexTypeMatch) {
		return parsers[regexTypeMatch[0] as K](input as TemporalInputMapping[K]);
	}
};
const getOffset = (date: Date) => {
	const offset = date.getTimezoneOffset();
	const absOffset = Math.abs(offset);
	const hoursOffset = Math.floor(absOffset / 60)
		.toString()
		.padStart(2, "0");
	const minutesOffset = (absOffset % 60).toString().padStart(2, "0");
	if (offset === 0) {
		return "Z";
	}
	return `${offset >= 0 ? "+" : "-"}${hoursOffset}:${minutesOffset}`;
};
export const serializers: {
	[K in TemporalType]: (input: TemporalMapping[K]) => TemporalInputMapping[K];
} = {
	plainTime: (input) =>
		input.value
			.toISOString()
			.slice(11, 23) as TemporalInputMapping["plainTime"],
	plainDate: (input) =>
		input.value.toISOString().slice(0, 10) as TemporalInputMapping["plainDate"],
	plainDateTime: (input) =>
		input.value
			.toISOString()
			.replace("T", " ") as TemporalInputMapping["plainDateTime"],
	zonedTime: (input) =>
		(input.value.toISOString().slice(11, 23).replace("Z", "") +
			getOffset(input.value)) as TemporalInputMapping["zonedTime"],
	zonedDateTime: (input) =>
		(input.value.toISOString().replace("T", " ").replace("Z", "") +
			getOffset(input.value)) as TemporalInputMapping["zonedDateTime"],
};
export const serialize = <K extends TemporalType>(
	input: TemporalMapping[K],
): TemporalInputMapping[K] =>
	serializers[input.type](input as never) as TemporalInputMapping[K];

export const compare = mapValues(
	temporalSchemas,
	() =>
		<T extends TemporalType>(a: TemporalMapping[T], b: TemporalMapping[T]) =>
			a.value.valueOf() - b.value.valueOf(),
) as {
	[K in TemporalType]: (a: TemporalMapping[K], b: TemporalMapping[K]) => number;
};
export const isFirstEarlier = mapValues(
	temporalSchemas,
	(_value, key) =>
		<T extends TemporalType>(a: TemporalMapping[T], b: TemporalMapping[T]) =>
			compare[key](a as never, b as never) < 0,
) as {
	[K in TemporalType]: (
		a: TemporalMapping[K],
		b: TemporalMapping[K],
	) => boolean;
};
export const areEqual = mapValues(
	temporalSchemas,
	(_value, key) =>
		<T extends TemporalType>(a: TemporalMapping[T], b: TemporalMapping[T]) =>
			compare[key](a as never, b as never) === 0,
) as {
	[K in TemporalType]: (
		a: TemporalMapping[K],
		b: TemporalMapping[K],
	) => boolean;
};

type TemporalDuration = DateTimeDuration;
// Very sloppy, but will do for some time
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.5 * DAY;
const YEAR = 365 * DAY;
export const serializeDuration = (duration: TemporalDuration): number =>
	(duration.years || 0) * YEAR +
	(duration.months || 0) * MONTH +
	(duration.weeks || 0) * WEEK +
	(duration.days || 0) * DAY +
	(duration.hours || 0) * HOUR +
	(duration.minutes || 0) * MINUTE +
	(duration.seconds || 0) * SECOND +
	(duration.milliseconds || 0);
const dets = (input: number, limiter: number) =>
	[Math.floor(input / limiter), input % limiter] as const;
export const parseDuration = (duration: number): TemporalDuration => {
	const [years, restYears] = dets(duration, YEAR);
	const [months, restMonths] = dets(restYears, MONTH);
	const [weeks, restWeeks] = dets(restMonths, WEEK);
	const [days, restDays] = dets(restWeeks, DAY);
	const [hours, restHours] = dets(restDays, HOUR);
	const [minutes, restMinutes] = dets(restHours, MINUTE);
	const [seconds, milliseconds] = dets(restMinutes, SECOND);
	return { years, months, weeks, days, hours, minutes, seconds, milliseconds };
};
const valueMapper = <T extends TemporalType>(
	date: TemporalMapping[T],
	mapper: (input: number) => number,
): TemporalMapping[T] =>
	createTemporal<T>(date.type as T, new Date(mapper(date.value.valueOf())));
const reduceDurations = (...durations: TemporalDuration[]) =>
	durations.reduce((acc, duration) => acc + serializeDuration(duration), 0);
export const add = mapValues(
	temporalSchemas,
	() =>
		<T extends TemporalType>(
			date: TemporalMapping[T],
			...durations: TemporalDuration[]
		) =>
			valueMapper(date, (value) => value + reduceDurations(...durations)),
) as {
	[K in TemporalType]: (
		date: TemporalMapping[K],
		...durations: TemporalDuration[]
	) => TemporalMapping[K];
};
export const substract = mapValues(
	temporalSchemas,
	() =>
		<T extends TemporalType>(
			date: TemporalMapping[T],
			...durations: TemporalDuration[]
		) =>
			valueMapper(date, (value) => value - reduceDurations(...durations)),
) as {
	[K in TemporalType]: (
		date: TemporalMapping[K],
		...durations: TemporalDuration[]
	) => TemporalMapping[K];
};
