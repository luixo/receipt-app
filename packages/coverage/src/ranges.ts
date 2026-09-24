import type { Profiler } from "node:inspector";

import type { RestoreRangeEnd } from "./generated-code";

export type V8FunctionCoverage = Pick<Profiler.FunctionCoverage, "ranges">;

type Range = { startOffset: number; endOffset: number };

// Execution count of the code at a generated offset
export type CountAt = (offset: number) => number;

const lastIndexAtOrBefore = (sortedValues: number[], value: number) => {
	let low = 0;
	let high = sortedValues.length - 1;
	let result = -1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		// oxlint-disable-next-line typescript/no-non-null-assertion
		if (sortedValues[middle]! <= value) {
			result = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return result;
};

// For properly nested ranges, returns a value of the innermost range covering an offset.
// Ranges are flattened into sorted, non-overlapping segments for binary search lookups.
export const createSegmentLookup = <R extends Range, T>(
	rawRanges: R[],
	getValue: (range: R) => T,
) => {
	const ranges = rawRanges
		.filter((range) => range.endOffset > range.startOffset)
		// Outer ranges first; `toSorted` is stable, so input order is kept for equal ranges
		.toSorted(
			(a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset,
		);
	const boundaries = [
		...new Set(ranges.flatMap((range) => [range.startOffset, range.endOffset])),
	].toSorted((a, b) => a - b);

	const segmentValues: (T | undefined)[] = [];
	const openRanges: R[] = [];
	let nextRangeIndex = 0;
	for (const boundary of boundaries) {
		while ((openRanges.at(-1)?.endOffset ?? Infinity) <= boundary) {
			openRanges.pop();
		}
		while (ranges[nextRangeIndex]?.startOffset === boundary) {
			// oxlint-disable-next-line typescript/no-non-null-assertion
			openRanges.push(ranges[nextRangeIndex]!);
			nextRangeIndex += 1;
		}
		const innermostRange = openRanges.at(-1);
		segmentValues.push(innermostRange && getValue(innermostRange));
	}

	return (offset: number) =>
		segmentValues[lastIndexAtOrBefore(boundaries, offset)];
};

// V8 block coverage is a tree of nested ranges (functions, then blocks inside them),
// the innermost range covering an offset holds its count
export const createCountAt = (
	functions: V8FunctionCoverage[],
	restoreRangeEnd: RestoreRangeEnd,
): CountAt => {
	const ranges = functions.flatMap(({ ranges: functionRanges }) =>
		functionRanges.map((range, index) =>
			// The first range is the function itself, others are blocks
			index === 0
				? range
				: {
						...range,
						endOffset: restoreRangeEnd(range.startOffset, range.endOffset),
					},
		),
	);
	const getCount = createSegmentLookup(ranges, (range) => range.count);
	return (offset) => getCount(offset) ?? 0;
};
