import type { Faker, NumberOrRange } from "@faker-js/faker";

import { CURRENCY_CODES } from "~utils/currency-data";

export const generateAmount = <T>(
	faker: Faker,
	generatedAmount: NumberOrRange,
	generatorFn: () => T,
): T[] => {
	const amount =
		typeof generatedAmount === "number"
			? generatedAmount
			: generatedAmount.min +
				faker.number.int(generatedAmount.max - generatedAmount.min);
	return Array.from({ length: amount }, generatorFn);
};

export type GeneratorFnWithFaker<O, I = object> = (
	opts: { faker: Faker; index?: number } & I,
) => O;

export type GeneratorFnWithAmount<O, I = object> = GeneratorFnWithFaker<
	O[],
	{ amount?: NumberOrRange } & I
>;

export const generateCurrencyCode = (faker: Faker) =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export const generateCurrencyCodes = (faker: Faker, amount?: NumberOrRange) =>
	faker.helpers.arrayElements(CURRENCY_CODES, amount);
