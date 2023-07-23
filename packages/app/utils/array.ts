export const rotate = <T>(array: T[], by: number): T[] => {
	const byConstrained = by % array.length;
	return array
		.slice(byConstrained, array.length)
		.concat(array.slice(0, byConstrained));
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
	ref?: React.MutableRefObject<T | undefined>,
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
	ref?: React.MutableRefObject<T | undefined>,
) => {
	const matchedIndex = array.findIndex(predicate);
	if (matchedIndex === -1) {
		return array;
	}
	return replace(array, updater(array[matchedIndex]!), matchedIndex, ref);
};

export const upsertInArray = <T>(
	array: T[],
	predicate: (item: T, index: number, items: T[]) => boolean,
	updater: (prevItem: T) => T,
	defaultValue: T,
	ref?: React.MutableRefObject<T | undefined>,
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
	ref?: React.MutableRefObject<ItemWithIndex<T> | undefined>,
) => {
	const matchedIndex = array.findIndex(predicate);
	if (matchedIndex === -1) {
		return array;
	}
	if (ref) {
		ref.current = {
			index: matchedIndex,
			item: array[matchedIndex]!,
		};
	}
	return [...array.slice(0, matchedIndex), ...array.slice(matchedIndex + 1)];
};

export const addToArray = <T>(array: T[], item: T, index: number) => [
	...array.slice(0, index),
	item,
	...array.slice(index),
];
