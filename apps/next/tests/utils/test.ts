import type { Suite } from "vitest";
import { test as originalTest } from "vitest";

import type { CacheDbOptionsMock } from "next-tests/utils/mocks/cache-db";
import { getCacheDbOptions } from "next-tests/utils/mocks/cache-db";
import type { EmailOptionsMock } from "next-tests/utils/mocks/email";
import { getEmailOptions } from "next-tests/utils/mocks/email";
import type { ExchangeRateOptionsMock } from "next-tests/utils/mocks/exchange-rate";
import { getExchangeRateOptions } from "next-tests/utils/mocks/exchange-rate";
import type { ResponseHeadersMock } from "next-tests/utils/mocks/response-headers";
import { getResponseHeaders } from "next-tests/utils/mocks/response-headers";

export type TestContext = {
	emailOptions: EmailOptionsMock;
	responseHeaders: ResponseHeadersMock;
	cacheDbOptions: CacheDbOptionsMock;
	exchangeRateOptions: ExchangeRateOptionsMock;
} & Suite["suiteContext"];
export type TestFixture = { ctx: TestContext };

export const test = originalTest.extend<TestFixture>({
	ctx: async ({ task }, use) => {
		const { suiteContext } = task.suite.file!;
		suiteContext.logger.resetMessages();
		await use({
			emailOptions: getEmailOptions(),
			cacheDbOptions: getCacheDbOptions(),
			responseHeaders: getResponseHeaders(),
			exchangeRateOptions: getExchangeRateOptions(),
			...suiteContext,
		});
	},
});
