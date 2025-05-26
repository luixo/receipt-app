import { Faker, en, faker } from "@faker-js/faker";
import type { inferProcedureOutput } from "@trpc/server";
import type { RunnerTestCase } from "vitest";
import { test as originalTest } from "vitest";

import type { Database } from "~db/types";
import type { AppRouter } from "~tests/backend/databases/router";
import type { CacheDbOptionsMock } from "~tests/backend/utils/mocks/cache-db";
import { getCacheDbOptions } from "~tests/backend/utils/mocks/cache-db";
import type { EmailOptionsMock } from "~tests/backend/utils/mocks/email";
import { getEmailOptions } from "~tests/backend/utils/mocks/email";
import type { ExchangeRateOptionsMock } from "~tests/backend/utils/mocks/exchange-rate";
import { getExchangeRateOptions } from "~tests/backend/utils/mocks/exchange-rate";
import type { LoggerMock } from "~tests/backend/utils/mocks/logger";
import type { S3OptionsMock } from "~tests/backend/utils/mocks/s3";
import { getS3Options } from "~tests/backend/utils/mocks/s3";
import { setSeed } from "~tests/utils/faker";

type FileContext = {
	logger: LoggerMock;
	database: Database;
	dumpDatabase: () => Promise<inferProcedureOutput<AppRouter["dumpDatabase"]>>;
	truncateDatabase: () => Promise<
		inferProcedureOutput<AppRouter["truncateDatabase"]>
	>;
};

declare module "vitest" {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RunnerTestSuite {
		fileContext: FileContext;
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
	cacheDbOptions: CacheDbOptionsMock;
	exchangeRateOptions: ExchangeRateOptionsMock;
	s3Options: S3OptionsMock;
};

type MetaContext = {
	task: RunnerTestCase;
};

export type TestContext = FakerContext &
	MockContext &
	FileContext &
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
		const { fileContext } = task.file;
		fileContext.logger.resetMessages();
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
			...fileContext,
		});
	},
});
