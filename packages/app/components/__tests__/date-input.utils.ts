import { type Locator, expect, test as originalTest } from "@playwright/test";

import { localSettings } from "~tests/frontend/consts";

// TODO: add date-fns date formatting
const formatToInputString = (date: Date | number) =>
	new Date(date).toISOString().slice(0, 10);

const formatToDateString = (date: Date | number) =>
	new Intl.DateTimeFormat(localSettings.locale).format(date);

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
