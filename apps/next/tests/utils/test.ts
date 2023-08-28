import { test as originalTest } from "vitest";

import type { EmailOptions } from "next-app/utils/email";

export type TestContext = {
	emailOptions: EmailOptions;
};

const getDefaultEmailOptions = (): EmailOptions => ({
	active: true,
	broken: false,
	cachedMessages: [],
});
let emailOptions = getDefaultEmailOptions();
export const test = originalTest.extend<{ ctx: TestContext }>({
	// see https://github.com/vitest-dev/vitest/pull/3651#issuecomment-1609232521
	// eslint-disable-next-line no-empty-pattern
	ctx: async ({}, use) => {
		await use({ emailOptions });
		emailOptions = getDefaultEmailOptions();
	},
});
