import { test } from "@playwright/test";

type CurrencyFixtures = {
	fromSubunitToUnit: (input: number) => number;
	fromUnitToSubunit: (input: number) => number;
};

const mockFromSubunitToUnit = (input: number) => input / 100;
const mockFromUnitToSubunit = (input: number) => Math.round(input * 100);

export const currencyFixtures = test.extend<CurrencyFixtures>({
	fromSubunitToUnit: async ({}, use) =>
		use((input) => mockFromSubunitToUnit(input)),
	fromUnitToSubunit: async ({}, use) =>
		use((input) => mockFromUnitToSubunit(input)),
});
