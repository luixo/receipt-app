import { type Locator, expect, test as originalTest } from "@playwright/test";

import { localSettings } from "~tests/frontend/consts";
import { type Temporal, formatters, serialize } from "~utils/date";

type Fixtures = {
	expectDate: (locator: Locator, date: Temporal.PlainDate) => Promise<void>;
	fillDate: (locator: Locator, date: Temporal.PlainDate) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	expectDate: async ({}, use) => {
		await use(async (locator, date) => {
			await expect(locator).toHaveValue(
				formatters.plainDate(date, localSettings.locale),
			);
		});
	},
	fillDate: async ({ expectDate }, use) => {
		await use(async (locator, date) => {
			await locator.fill(serialize(date));
			await expectDate(locator, date);
		});
	},
});
