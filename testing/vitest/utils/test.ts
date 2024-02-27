import { Faker, en, faker } from "@faker-js/faker";
import type { inferProcedureOutput } from "@trpc/server";
import type { Test } from "vitest";
import { test as originalTest } from "vitest";

import type { AppRouter } from "~tests/backend/databases/router";
import { setSeed } from "~tests/backend/utils/faker";
import type { CacheDbOptionsMock } from "~tests/backend/utils/mocks/cache-db";
import { getCacheDbOptions } from "~tests/backend/utils/mocks/cache-db";
import type { EmailOptionsMock } from "~tests/backend/utils/mocks/email";
import { getEmailOptions } from "~tests/backend/utils/mocks/email";
import type { ExchangeRateOptionsMock } from "~tests/backend/utils/mocks/exchange-rate";
import { getExchangeRateOptions } from "~tests/backend/utils/mocks/exchange-rate";
import type { LoggerMock } from "~tests/backend/utils/mocks/logger";
import type { ResponseHeadersMock } from "~tests/backend/utils/mocks/response-headers";
import { getResponseHeaders } from "~tests/backend/utils/mocks/response-headers";
import type { S3OptionsMock } from "~tests/backend/utils/mocks/s3";
import { getS3Options } from "~tests/backend/utils/mocks/s3";
import type { Database } from "~web/db";

type SuiteContext = {
	logger: LoggerMock;
	database: Database;
	dumpDatabase: () => Promise<inferProcedureOutput<AppRouter["dumpDatabase"]>>;
	truncateDatabase: () => Promise<
		inferProcedureOutput<AppRouter["truncateDatabase"]>
	>;
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
	s3Options: S3OptionsMock;
};

type MetaContext = {
	task: Test;
};

export type TestContext = FakerContext &
	MockContext &
	SuiteContext &
	MetaContext;
export type TestFixture = { ctx: TestContext };

export const createStableFaker = (input: string) => {
	const instance = new Faker({ locale: en });
	setSeed(instance, input);
	return instance;
};

// see https://github.com/veritem/eslint-plugin-vitest/issues/281
// eslint-disable-next-line vitest/expect-expect
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
			s3Options: getS3Options(),
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
			task,
			...suiteContext,
		});
	},
});
