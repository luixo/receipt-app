import type { Faker } from "@faker-js/faker";

import { CURRENCY_CODES } from "~utils/currency-data";

export type GeneratedAmount = number | { min: number; max: number };

export const generateAmount = <T>(
	faker: Faker,
	generatedAmount: GeneratedAmount,
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
	opts: { faker: Faker } & I,
) => O;

export type GeneratorFnWithAmount<O, I = object> = GeneratorFnWithFaker<
	O[],
	{ amount?: GeneratedAmount } & I
>;

export const generateCurrencyCode = (faker: Faker) =>
	faker.helpers.arrayElement(CURRENCY_CODES);
