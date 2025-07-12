import type {
	DateDuration,
	DateTimeDuration,
	TimeDuration,
} from "@internationalized/date";
import {
	CalendarDate,
	CalendarDateTime,
	DateFormatter,
	Time,
	ZonedDateTime,
	fromDate as fromDateRaw,
	getLocalTimeZone,
	now,
	parseDate,
	parseDateTime,
	parseTime,
	parseZonedDateTime,
	toCalendarDate,
	toCalendarDateTime,
	toTime,
	today,
} from "@internationalized/date";
import { identity, mapValues, values } from "remeda";
import { z } from "zod";

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
type TZonedDateTime = `${TPlainDateTime}[${string}]`;

export const temporalClasses = {
	plainTime: Time,
	plainDate: CalendarDate,
	plainDateTime: CalendarDateTime,
	zonedDateTime: ZonedDateTime,
};
const temporalClassNames = {
	plainTime: "Time",
	plainDate: "CalendarDate",
	plainDateTime: "CalendarDateTime",
	zonedDateTime: "ZonedDateTime",
} satisfies Record<TemporalType, string>;
export const temporalSchemas = mapValues(temporalClasses, (value, key) =>
	z.instanceof(value, {
		message: `Input not instance of ${temporalClassNames[key]}`,
	}),
) as {
	[K in TemporalType]: z.ZodCustom<
		InstanceType<(typeof temporalClasses)[K]>,
		InstanceType<(typeof temporalClasses)[K]>
	>;
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Temporal {
	export type PlainTime = InstanceType<(typeof temporalClasses)["plainTime"]>;
	export type PlainDate = InstanceType<(typeof temporalClasses)["plainDate"]>;
	export type PlainDateTime = InstanceType<
		(typeof temporalClasses)["plainDateTime"]
	>;
	export type ZonedDateTime = InstanceType<
		(typeof temporalClasses)["zonedDateTime"]
	>;
}
export type TemporalMapping = {
	plainTime: Temporal.PlainTime;
	plainDate: Temporal.PlainDate;
	plainDateTime: Temporal.PlainDateTime;
	zonedDateTime: Temporal.ZonedDateTime;
};
export type TemporalType = keyof TemporalMapping;
export const isTemporalObject = <T extends TemporalType>(
	input: unknown,
): input is TemporalMapping[T] =>
	values(temporalClasses).some((Class) => input instanceof Class);

export type TemporalInputMapping = {
	plainTime: TPlainTime;
	plainDate: TPlainDate;
	plainDateTime: TPlainDateTime;
	zonedDateTime: TZonedDateTime;
};

export const localTimeZone = getLocalTimeZone();
export const getNow = {
	plainTime: () => toTime(now(localTimeZone)),
	plainDate: () => today(localTimeZone),
	plainDateTime: () => toCalendarDateTime(now(localTimeZone)),
	zonedDateTime: () => now(localTimeZone),
} as {
	[K in TemporalType]: () => TemporalMapping[K];
};
export const fromDate = {
	plainTime: (date) => toTime(fromDateRaw(date, localTimeZone)),
	plainDate: (date) => toCalendarDate(fromDateRaw(date, localTimeZone)),
	plainDateTime: (date) => toCalendarDateTime(fromDateRaw(date, localTimeZone)),
	zonedDateTime: (date) => fromDateRaw(date, localTimeZone),
} as {
	// eslint-disable-next-line no-restricted-syntax
	[K in TemporalType]: (input: Date) => TemporalMapping[K];
};
export const toDate = {
	plainTime: (input) =>
		toCalendarDateTime(now(localTimeZone), input).toDate(localTimeZone),
	plainDate: (input) => input.toDate(localTimeZone),
	plainDateTime: (input) => input.toDate(localTimeZone),
	zonedDateTime: (input) => input.toDate(),
} as {
	// eslint-disable-next-line no-restricted-syntax
	[K in TemporalType]: (input: TemporalMapping[K]) => Date;
};
type ZonedProperties = "timeZone" | "timeZoneName";
type TimeProperies =
	| "timeStyle"
	| "fractionalSecondDigits"
	| "hourCycle"
	| "hour"
	| "minute"
	| "second"
	| "hour12";
type DateProperies =
	| "dateStyle"
	| "dayPeriod"
	| "weekday"
	| "era"
	| "year"
	| "month"
	| "day";
type FormatOptions = {
	plainTime: Omit<Intl.DateTimeFormatOptions, ZonedProperties | DateProperies>;
	plainDate: Omit<Intl.DateTimeFormatOptions, ZonedProperties | TimeProperies>;
	plainDateTime: Omit<Intl.DateTimeFormatOptions, ZonedProperties>;
	zonedDateTime: Intl.DateTimeFormatOptions;
};
export const formatters: {
	[K in TemporalType]: (
		input: TemporalMapping[K],
		locale: Locale,
		options?: FormatOptions[K],
	) => string;
} = {
	plainTime: (input, locale, options) =>
		new DateFormatter(locale, {
			timeStyle: "short",
			...options,
		}).format(toDate.plainTime(input)),
	plainDate: (input, locale, options) =>
		new DateFormatter(locale, {
			dateStyle: "medium",
			...options,
		}).format(toDate.plainDate(input)),
	plainDateTime: (input, locale, options) =>
		new DateFormatter(locale, {
			dateStyle: "medium",
			timeStyle: "short",
			...options,
		}).format(toDate.plainDateTime(input)),
	zonedDateTime: (input, locale, options) =>
		new DateFormatter(locale, {
			dateStyle: "medium",
			timeStyle: "short",
			...options,
		}).format(toDate.zonedDateTime(input)),
};
export const parsers = {
	plainTime: (input) => parseTime(input),
	plainDate: (input) => parseDate(input),
	plainDateTime: (input) => parseDateTime(input),
	zonedDateTime: (input) => parseZonedDateTime(input),
} as {
	[K in TemporalType]: (input: TemporalInputMapping[K]) => TemporalMapping[K];
};
export const deserialize = <K extends TemporalType>(
	input: string,
	converter: (input: string) => string = identity(),
): TemporalMapping[K] | undefined =>
	values(parsers)
		.map((parser) => {
			try {
				// @ts-expect-error Union type is too cumbersome to fix
				return parser(converter(input));
			} catch {
				// eslint-disable-next-line no-useless-return
				return;
			}
		})
		.find((value) => value) as TemporalMapping[K] | undefined;
export const serialize = <K extends TemporalType>(input: TemporalMapping[K]) =>
	input.toString() as TemporalInputMapping[K];

export const compare = mapValues(
	temporalClasses,
	() =>
		<T extends TemporalType>(a: TemporalMapping[T], b: TemporalMapping[T]) =>
			a.compare(b as never),
) as {
	[K in TemporalType]: (a: TemporalMapping[K], b: TemporalMapping[K]) => number;
};
export const isFirstEarlier = mapValues(
	temporalClasses,
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
	temporalClasses,
	(_value, key) =>
		<T extends TemporalType>(a: TemporalMapping[T], b: TemporalMapping[T]) =>
			compare[key](a as never, b as never) === 0,
) as {
	[K in TemporalType]: (
		a: TemporalMapping[K],
		b: TemporalMapping[K],
	) => boolean;
};

// Very sloppy, but will do for some time
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.5 * DAY;
const YEAR = 365 * DAY;
export const serializeDuration = (
	duration: DateDuration | TimeDuration | DateTimeDuration,
): number =>
	("years" in duration && duration.years ? duration.years : 0) * YEAR +
	("months" in duration && duration.months ? duration.months : 0) * MONTH +
	("weeks" in duration && duration.weeks ? duration.weeks : 0) * WEEK +
	("days" in duration && duration.days ? duration.days : 0) * DAY +
	("hours" in duration && duration.hours ? duration.hours : 0) * HOUR +
	("minutes" in duration && duration.minutes ? duration.minutes : 0) * MINUTE +
	("seconds" in duration && duration.seconds ? duration.seconds : 0) * SECOND +
	("milliseconds" in duration && duration.milliseconds
		? duration.milliseconds
		: 0);
const dets = (input: number, limiter: number) =>
	[Math.floor(input / limiter), input % limiter] as const;
export const parseDuration = (
	duration: number,
): DateDuration | TimeDuration | DateTimeDuration => {
	const [years, restYears] = dets(duration, YEAR);
	const [months, restMonths] = dets(restYears, MONTH);
	const [weeks, restWeeks] = dets(restMonths, WEEK);
	const [days, restDays] = dets(restWeeks, DAY);
	const [hours, restHours] = dets(restDays, HOUR);
	const [minutes, restMinutes] = dets(restHours, MINUTE);
	const [seconds, milliseconds] = dets(restMinutes, SECOND);
	return { years, months, weeks, days, hours, minutes, seconds, milliseconds };
};
type DurationMapping = {
	plainTime: TimeDuration;
	plainDate: DateDuration;
	plainDateTime: DateTimeDuration;
	zonedDateTime: DateTimeDuration;
};
export const add = mapValues(
	temporalClasses,
	() =>
		<T extends TemporalType>(
			date: TemporalMapping[T],
			...durations: DurationMapping[T][]
		) =>
			durations.reduce(
				(acc, duration) => acc.add(duration) as TemporalMapping[T],
				date,
			),
) as {
	[K in TemporalType]: (
		date: TemporalMapping[K],
		...durations: DurationMapping[K][]
	) => TemporalMapping[K];
};
export const subtract = mapValues(
	temporalClasses,
	() =>
		<T extends TemporalType>(
			date: TemporalMapping[T],
			...durations: DurationMapping[T][]
		) =>
			durations.reduce(
				(acc, duration) => acc.subtract(duration) as TemporalMapping[T],
				date,
			),
) as {
	[K in TemporalType]: (
		date: TemporalMapping[K],
		...durations: DurationMapping[K][]
	) => TemporalMapping[K];
};
