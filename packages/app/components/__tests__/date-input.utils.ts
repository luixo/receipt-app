import { type Locator, expect, test as originalTest } from "@playwright/test";

// TODO: add date-fns date formatting
const formatToInputString = (date: Date | number) =>
	new Date(date).toISOString().slice(0, 10);

// TODO: add date-fns date formatting
const formatToDateString = (date: Date | number) => {
	const iso = new Date(date).toISOString();
	return [iso.slice(8, 10), iso.slice(5, 7), iso.slice(0, 4)].join(".");
};

type Fixtures = {
	expectDate: (locator: Locator, date: Date | number) => Promise<void>;
	fillDate: (locator: Locator, date: Date | number) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	expectDate: async ({}, use) => {
		await use(async (locator, date) => {
			await expect(locator).toHaveValue(formatToDateString(date));
		});
	},
	fillDate: async ({ expectDate }, use) => {
		await use(async (locator, date) => {
			await locator.fill(formatToInputString(date));
			await expectDate(locator, date);
		});
	},
});
