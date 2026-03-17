import { faker } from "@faker-js/faker";
import { keys } from "remeda";
import { assert, describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { CacheDbOptionsMock } from "~tests/backend/utils/mocks/cache-db";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./rates";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const getFakeRate = () => Number(faker.finance.amount(0.01, 100));

describe("currency.rates", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ from: "", to: [] }),
		);

		test(`invalid "from" currency code`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "foo", to: ["USD"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "from": Currency does not exist in currency list`,
			);
		});

		test(`invalid "to" currency code`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["USD", "bar"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to[1]": Currency does not exist in currency list`,
			);
		});

		test(`invalid "to" codes amount`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: [] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to": Too small: expected array to have >=1 items`,
			);
		});

		test(`"to" and "from" codes are the same`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["EUR", "USD"] }),
				"BAD_REQUEST",
				`Currency code "from" and "to" must be different`,
			);
		});
	});

	describe("functionality", () => {
		describe("cache db throws", () => {
			test(`on getValue request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock;
				dbMock.setResponder("getValue", async () => {
					throw new Error('Throw on "getValue" request');
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ from: "USD", to: ["EUR"] }),
					"INTERNAL_SERVER_ERROR",
					'Throw on "getValue" request',
				);
			});

			test(`on setValue request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock;
				dbMock.setResponder("getValue", async () => null);
				dbMock.setResponder("setValue", async () => {
					throw new Error('Throw on "setValue" request');
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				// Throwing on setValue doesn't affect flow as result may be discarded
				await caller.procedure({ from: "USD", to: ["EUR"] });
			});
		});

		describe("cache is empty", () => {
			const respondAsEmptyCache = (dbMock: CacheDbOptionsMock["mock"]) => {
				dbMock.setResponder("getValue", async () => null);
				dbMock.setResponder("setValue", async () => {});
			};

			test("exchange rate provider throws", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(() => {
					throw new Error("Generic exchange rate mock error");
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							from: "USD",
							to: ["EUR", "MOP", "VND"],
						}),
					"INTERNAL_SERVER_ERROR",
					"Generic exchange rate mock error",
				);
			});

			test("exchange rate returned", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(async () => getFakeRate());
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(keys(result).toSorted()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].toSorted(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				expect(dbMessages).toStrictEqual<typeof dbMessages>([
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"getValue",
						[`${currencyFrom}->${currencyTo}`],
						{ result: null },
					]),
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"setValue",
						[
							`${currencyFrom}->${currencyTo}`,
							result[currencyTo]?.toString(),
							{ expiryInS: 1440000 },
						],
						{ result: undefined },
					]),
				]);
			});
		});

		describe("cache has partial data", () => {
			test(`exchange rate returned`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock;
				const currencyInCache = "EUR";
				const fakeRate = getFakeRate();
				dbMock.setResponder("getValue", async (key) =>
					key.includes(currencyInCache) ? fakeRate.toString() : null,
				);
				dbMock.setResponder("setValue", async () => {});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(keys(result).toSorted()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].toSorted(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				expect(dbMessages).toStrictEqual<typeof dbMessages>([
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"getValue",
						[`${currencyFrom}->${currencyTo}`],
						{
							result:
								currencyTo === currencyInCache ? fakeRate.toString() : null,
						},
					]),
					...currenciesTo
						.filter((currencyTo) => currencyTo !== currencyInCache)
						.map<
							(typeof dbMessages)[number]
						>((currencyTo) => ["setValue", [`${currencyFrom}->${currencyTo}`, result[currencyTo]?.toString(), { expiryInS: 1440000 }], { result: undefined }]),
				]);
			});
		});

		describe("cache has required data", () => {
			test(`exchange rate returned`, async ({ ctx }) => {
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const dbMock = ctx.cacheDbOptions.mock;
				const fakeRates = currenciesTo.reduce<Record<string, number>>(
					(acc, currencyTo) => ({
						...acc,
						[currencyTo]: getFakeRate(),
					}),
					{},
				);
				dbMock.setResponder("getValue", async (key) => {
					const currencyTo = key.split("->")[1];
					assert(currencyTo, "Expected to have format 'USD->EUR' in key");
					return fakeRates[currencyTo]?.toString() ?? null;
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(keys(result).toSorted()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].toSorted(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				expect(dbMessages).toStrictEqual<typeof dbMessages>(
					currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"getValue",
						[`${currencyFrom}->${currencyTo}`],
						{ result: fakeRates[currencyTo]?.toString() },
					]),
				);
			});
		});

		test(`currencyCode casing is ignored`, async ({ ctx }) => {
			const dbMock = ctx.cacheDbOptions.mock;
			dbMock.setResponder("getValue", async () => getFakeRate().toString());
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const currencyFrom = "uSd";
			const currenciesTo = ["EUR", "mop", "VnD"];
			const result = await caller.procedure({
				from: currencyFrom,
				to: currenciesTo,
			});
			expect(keys(result).toSorted()).toStrictEqual<typeof currenciesTo>(
				[...currenciesTo].map((code) => code.toUpperCase()).toSorted(),
			);
		});
	});
});
