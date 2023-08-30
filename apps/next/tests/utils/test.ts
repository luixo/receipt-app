import type { Suite } from "vitest";
import { test as originalTest } from "vitest";

import type { CacheDbOptionsMock } from "next-tests/utils/mocks/cache-db";
import { getCacheDbOptions } from "next-tests/utils/mocks/cache-db";
import type { EmailOptionsMock } from "next-tests/utils/mocks/email";
import { getEmailOptions } from "next-tests/utils/mocks/email";
import type { ResponseHeadersMock } from "next-tests/utils/mocks/response-headers";
import { getResponseHeaders } from "next-tests/utils/mocks/response-headers";

export type TestContext = {
	emailOptions: EmailOptionsMock;
	responseHeaders: ResponseHeadersMock;
	cacheDbOptions: CacheDbOptionsMock;
} & Suite["suiteContext"];
export type TestFixture = { ctx: TestContext };

export const test = originalTest.extend<TestFixture>({
	ctx: async ({ task }, use) => {
		await use({
			emailOptions: getEmailOptions(),
			cacheDbOptions: getCacheDbOptions(),
			responseHeaders: getResponseHeaders(),
			...task.suite.file!.suiteContext,
		});
	},
});
