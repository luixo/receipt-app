import { Faker, en, faker as globalFaker } from "@faker-js/faker";
import type { inferProcedureOutput } from "@trpc/server";
import type { RunnerTestCase } from "vitest";
import { test as originalTest } from "vitest";

import type { Database } from "#db/database.ts";
import type { AppRouter } from "#tests/backend/databases/router.ts";
import type { CacheDbOptionsMock } from "#tests/backend/utils/mocks/cache-db.ts";
import { getCacheDbOptions } from "#tests/backend/utils/mocks/cache-db.ts";
import type { EmailOptionsMock } from "#tests/backend/utils/mocks/email.ts";
import { getEmailOptions } from "#tests/backend/utils/mocks/email.ts";
import type { ExchangeRateOptionsMock } from "#tests/backend/utils/mocks/exchange-rate.ts";
import { getExchangeRateOptions } from "#tests/backend/utils/mocks/exchange-rate.ts";
import type { LoggerMock } from "#tests/backend/utils/mocks/logger.ts";
import type { S3OptionsMock } from "#tests/backend/utils/mocks/s3.ts";
import { getS3Options } from "#tests/backend/utils/mocks/s3.ts";
import { setSeed } from "#tests/utils/faker.ts";

type FileContext = {
	logger: LoggerMock;
	database?: {
		instance: Database;
		dump: () => Promise<inferProcedureOutput<AppRouter["dumpDatabase"]>>;
		truncate: () => Promise<
			inferProcedureOutput<AppRouter["truncateDatabase"]>
		>;
	};
};

declare module "vitest" {
	// external interface extension
	// oxlint-disable-next-line typescript/consistent-type-definitions
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
	baseUrl: string;
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
		setSeed(globalFaker, testId);
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
			baseUrl: "http://receipt-app.test/",
			...fileContext,
		});
	},
});
