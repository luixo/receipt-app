import type { Suite } from "vitest";
import { test as originalTest } from "vitest";

import type { EmailOptions } from "next-app/utils/email";

type HeaderValue = number | string | ReadonlyArray<string>;
type HeaderTuple = [name: string, value: HeaderValue];

export type TestContext = {
	emailOptions: EmailOptions;
	responseHeaders: HeaderTuple[];
} & Suite["suiteContext"];
export type TestFixture = { ctx: TestContext };

const getDefaultEmailOptions = (): EmailOptions => ({
	active: true,
	broken: false,
	cachedMessages: [],
});
let emailOptions = getDefaultEmailOptions();
let responseHeaders: HeaderTuple[] = [];
export const test = originalTest.extend<TestFixture>({
	// see https://github.com/vitest-dev/vitest/pull/3651#issuecomment-1609232521
	// eslint-disable-next-line no-empty-pattern
	ctx: async ({ task }, use) => {
		await use({
			emailOptions,
			responseHeaders,
			...task.suite.file!.suiteContext,
		});
		emailOptions = getDefaultEmailOptions();
		responseHeaders = [];
	},
});
