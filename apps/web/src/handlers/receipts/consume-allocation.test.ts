import { describe, expect } from "vitest";

import {
	getConsumeAllocation,
	getPartForFraction,
} from "~app/utils/consume-allocation";
import { test } from "~tests/backend/utils/test";

const consumers = [
	{ peerId: "a", part: 1 },
	{ peerId: "b", part: 1 },
	{ peerId: "c", part: 1 },
];

describe("consume allocation", () => {
	test("distributes rounding remainder without losing a cent", () => {
		expect(getConsumeAllocation(consumers, 10, 1, "USD")).toStrictEqual({
			a: 3.34,
			b: 3.33,
			c: 3.33,
		});
	});

	test("scales amounts proportionally when price or quantity changes", () => {
		const weights = [
			{ peerId: "a", part: 1 },
			{ peerId: "b", part: 3 },
		];
		expect(getConsumeAllocation(weights, 10, 1, "USD")).toStrictEqual({
			a: 2.5,
			b: 7.5,
		});
		expect(getConsumeAllocation(weights, 20, 2, "USD")).toStrictEqual({
			a: 10,
			b: 30,
		});
	});

	test("uses the currency's smallest unit", () => {
		expect(getConsumeAllocation(consumers, 10, 1, "JPY")).toStrictEqual({
			a: 4,
			b: 3,
			c: 3,
		});
	});

	test("handles empty or zero-valued items", () => {
		expect(getConsumeAllocation([], 10, 1, "USD")).toStrictEqual({});
		expect(getConsumeAllocation(consumers, 0, 1, "USD")).toStrictEqual({
			a: 0,
			b: 0,
			c: 0,
		});
	});

	test("changes one consumer's fraction without changing other weights", () => {
		expect(getPartForFraction(consumers, "a", 0.5)).toBe(2);
		expect(getPartForFraction([{ peerId: "a", part: 1 }], "a", 0.5)).toBeNull();
	});
});
