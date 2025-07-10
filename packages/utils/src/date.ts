import type { DateTimeDuration } from "@internationalized/date";

export const getNow = () => new Date();

export const getToday = () => {
	const now = getNow();
	now.setUTCHours(0, 0, 0, 0);
	return now;
};

export type TemporalDuration = DateTimeDuration;
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
const valueMapper = (date: Date, mapper: (input: number) => number): Date =>
	new Date(mapper(date.valueOf()));
const reduceDurations = (...durations: TemporalDuration[]) =>
	durations.reduce((acc, duration) => acc + serializeDuration(duration), 0);
export const add = (date: Date, ...durations: TemporalDuration[]) =>
	valueMapper(date, (value) => value + reduceDurations(...durations));
export const substract = (date: Date, ...durations: TemporalDuration[]) =>
	valueMapper(date, (value) => value - reduceDurations(...durations));
export const diff = (dateA: Date, dateB: Date) =>
	parseDuration(dateB.valueOf() - dateA.valueOf());
