import { Faker, en, faker } from "@faker-js/faker";
import { createHash } from "node:crypto";
import { test as originalTest } from "vitest";

import type { CacheDbOptionsMock } from "@tests/backend/utils/mocks/cache-db";
import { getCacheDbOptions } from "@tests/backend/utils/mocks/cache-db";
import type { EmailOptionsMock } from "@tests/backend/utils/mocks/email";
import { getEmailOptions } from "@tests/backend/utils/mocks/email";
import type { ExchangeRateOptionsMock } from "@tests/backend/utils/mocks/exchange-rate";
import { getExchangeRateOptions } from "@tests/backend/utils/mocks/exchange-rate";
import type { LoggerMock } from "@tests/backend/utils/mocks/logger";
import type { ResponseHeadersMock } from "@tests/backend/utils/mocks/response-headers";
import { getResponseHeaders } from "@tests/backend/utils/mocks/response-headers";
import type { Database } from "next-app/db";

type SuiteContext = {
	logger: LoggerMock;
	database: Database;
	dumpDatabase: () => Promise<string>;
	truncateDatabase: () => Promise<void>;
};

declare module "vitest" {
	interface Suite {
		suiteContext: SuiteContext;
	}
}

type FakerContext = {
	getUuid: () => string;
	getTestUuid: () => string;
	getSalt: () => string;
	getTestSalt: () => string;
};

type MockContext = {
	emailOptions: EmailOptionsMock;
	responseHeaders: ResponseHeadersMock;
	cacheDbOptions: CacheDbOptionsMock;
	exchangeRateOptions: ExchangeRateOptionsMock;
};

export type TestContext = FakerContext & MockContext & SuiteContext;
export type TestFixture = { ctx: TestContext };

const HASH_MAGNITUDE = 10 ** 30;

const setSeed = (instance: Faker, input: string) => {
	instance.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};

export const createStableFaker = (input: string) => {
	const instance = new Faker({ locale: en });
	setSeed(instance, input);
	return instance;
};

export const test = originalTest.extend<TestFixture>({
	ctx: async ({ task }, use) => {
		const { suiteContext } = task.suite.file!;
		suiteContext.logger.resetMessages();
		// Stable faker to generate uuid / salt on handler side
		const handlerIdFaker = createStableFaker(task.name);
		// Stable faker to generate uuid / salt on tests side
		const testIdFaker = createStableFaker(task.name);
		const testId = task.name;
		// Regular faker to generate fake data in a test
		setSeed(faker, testId);
		await use({
			emailOptions: getEmailOptions(),
			cacheDbOptions: getCacheDbOptions(),
			responseHeaders: getResponseHeaders(),
			exchangeRateOptions: getExchangeRateOptions(),
			getUuid: () => handlerIdFaker.string.uuid(),
			getSalt: () =>
				handlerIdFaker.string.hexadecimal({
					length: 128,
					casing: "lower",
					prefix: "",
				}),
			getTestUuid: () => testIdFaker.string.uuid(),
			getTestSalt: () =>
				testIdFaker.string.hexadecimal({
					length: 128,
					casing: "lower",
					prefix: "",
				}),
			...suiteContext,
		});
	},
});
