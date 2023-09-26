import type { Suite } from "vitest";
import { test as originalTest } from "vitest";

import type { CacheDbOptionsMock } from "@tests/backend/utils/mocks/cache-db";
import { getCacheDbOptions } from "@tests/backend/utils/mocks/cache-db";
import type { EmailOptionsMock } from "@tests/backend/utils/mocks/email";
import { getEmailOptions } from "@tests/backend/utils/mocks/email";
import type { ExchangeRateOptionsMock } from "@tests/backend/utils/mocks/exchange-rate";
import { getExchangeRateOptions } from "@tests/backend/utils/mocks/exchange-rate";
import type { ResponseHeadersMock } from "@tests/backend/utils/mocks/response-headers";
import { getResponseHeaders } from "@tests/backend/utils/mocks/response-headers";

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
