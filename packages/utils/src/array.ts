import type { TupleOf } from "./types";

export const rotate = <T>(array: T[], by: number): T[] => {
	const byConstrained = by % array.length;
	return array.slice(byConstrained).concat(array.slice(0, byConstrained));
};

export const isSameOrder = <T>(a: T[], b: T[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((aValue, index) => aValue === b[index]);
};

export type ItemWithIndex<T> = { index: number; item: T };

const replace = <T>(
	array: T[],
	item: T,
	index: number,
	ref?: React.RefObject<T | undefined>,
) => {
	if (array[index] === item) {
		return array;
	}
	if (ref) {
		ref.current = array[index];
	}
	return [...array.slice(0, index), item, ...array.slice(index + 1)];
};

export const replaceInArray = <T>(
	array: T[],
	predicate: (item: T, index: number, items: T[]) => boolean,
	updater: (prevItem: T) => T,
	ref?: React.RefObject<T | undefined>,
) => {
	const matchedIndex = array.findIndex(predicate);
	if (matchedIndex === -1) {
		return array;
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return replace(array, updater(array[matchedIndex]!), matchedIndex, ref);
};

export const upsertInArray = <T>(
	array: T[],
	predicate: (item: T, index: number, items: T[]) => boolean,
	updater: (prevItem: T) => T,
	defaultValue: T,
	ref?: React.RefObject<T | undefined>,
) => {
	const matchedIndex = array.findIndex(predicate);
	return replace(
		array,
		updater(array[matchedIndex] || defaultValue),
		matchedIndex === -1 ? Infinity : matchedIndex,
		ref,
	);
};

export const removeFromArray = <T>(
	array: T[],
	predicate: (item: T, index: number, items: T[]) => boolean,
	ref?: React.RefObject<ItemWithIndex<T> | undefined>,
) => {
	const matchedIndex = array.findIndex(predicate);
	if (matchedIndex === -1) {
		return array;
	}
	if (ref) {
		ref.current = {
			index: matchedIndex,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			item: array[matchedIndex]!,
		};
	}
	return [...array.slice(0, matchedIndex), ...array.slice(matchedIndex + 1)];
};

export const addToArray = <T>(
	array: T[],
	item: T,
	index: number = array.length - 1,
) => [...array.slice(0, index), item, ...array.slice(index)];

export const asFixedSizeArray =
	<N extends number>() =>
	<T>(array: T[]) =>
		array as TupleOf<T, N>;

export type Interval = [number, number];
export const mergeIntervals = (
	intervals: Interval[],
	connectAdjacentInts = false,
) =>
	intervals
		.sort((a, b) => a[0] - b[0])
		.reduce<Interval[]>((acc, [from, to]) => {
			const lastInterval = acc.at(-1);
			if (
				!lastInterval ||
				lastInterval[1] + (connectAdjacentInts ? 1 : 0) < from
			) {
				acc.push([from, to]);
			} else {
				lastInterval[1] = Math.max(lastInterval[1], to);
			}
			return acc;
		}, []);
