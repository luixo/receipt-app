import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

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
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "foo", to: ["USD"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "from": Invalid input`,
			);
		});

		test(`invalid "to" currency code`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["USD", "bar"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to[1]": Invalid input`,
			);
		});

		test(`invalid "to" codes amount`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: [] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to": Array must contain at least 1 element(s)`,
			);
		});

		test(`"to" and "from" codes are the same`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["EUR", "USD"] }),
				"BAD_REQUEST",
				`Currency code "from" and "to" must be different`,
			);
		});
	});

	describe("functionality", () => {
		describe("cache db throws", () => {
			test(`on ping request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				dbMock.setResponder("ping", async () => {
					throw new Error("Pong error");
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				// Throwing on ping doesn't affect flow as cache may be skipped
				await caller.procedure({ from: "USD", to: ["EUR"] });
				expect(dbMock.getMessages()).toHaveLength(1);
				const message = dbMock.getMessages()[0]!;
				expect(message).toStrictEqual<typeof message>([
					"ping",
					[],
					{ error: "Error: Pong error" },
				]);
			});

			test(`on get request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				dbMock.setResponder("get", async () => {
					throw new Error('Throw on "get" request');
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ from: "USD", to: ["EUR"] }),
					"INTERNAL_SERVER_ERROR",
					'Error: Throw on "get" request',
				);
			});

			test(`on setex request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				dbMock.setResponder("get", async () => null);
				dbMock.setResponder("setex", async () => {
					throw new Error('Throw on "setex" request');
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				// Throwing on setex doesn't affect flow as result may be discarded
				await caller.procedure({ from: "USD", to: ["EUR"] });
			});
		});

		describe("cache is empty", () => {
			const respondAsEmptyCache = (dbMock: CacheDbOptionsMock["mock"]) => {
				dbMock.setResponder("get", async () => null);
				dbMock.setResponder("setex", async () => "OK" as const);
			};

			test("exchange rate provider throws", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(() => {
					throw new Error("Generic exchange rate mock error");
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				const dbMock = ctx.cacheDbOptions.mock!;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(async () => getFakeRate());
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(Object.keys(result).sort()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].sort(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				// Removing ping message
				expect(dbMessages.slice(1)).toStrictEqual<typeof dbMessages>([
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"get",
						[`${currencyFrom}->${currencyTo}`],
						{ result: null },
					]),
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"setex",
						[`${currencyFrom}->${currencyTo}`, 1440, result[currencyTo]],
						{ result: "OK" },
					]),
				]);
			});
		});

		describe("cache has partial data", () => {
			test(`exchange rate returned`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				const currencyInCache = "EUR";
				const fakeRate = getFakeRate();
				dbMock.setResponder("get", async (key) =>
					key.includes(currencyInCache) ? fakeRate : null,
				);
				dbMock.setResponder("setex", async () => "OK" as const);
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(Object.keys(result).sort()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].sort(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				// Removing ping message
				expect(dbMessages.slice(1)).toStrictEqual<typeof dbMessages>([
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"get",
						[`${currencyFrom}->${currencyTo}`],
						{ result: currencyTo === currencyInCache ? fakeRate : null },
					]),
					...currenciesTo
						.filter((currencyTo) => currencyTo !== currencyInCache)
						.map<(typeof dbMessages)[number]>((currencyTo) => [
							"setex",
							[`${currencyFrom}->${currencyTo}`, 1440, result[currencyTo]],
							{ result: "OK" },
						]),
				]);
			});
		});

		describe("cache has required data", () => {
			test(`exchange rate returned`, async ({ ctx }) => {
				const currencyFrom = "USD";
				const currenciesTo = ["EUR", "MOP", "VND"];
				const dbMock = ctx.cacheDbOptions.mock!;
				const fakeRates = currenciesTo.reduce<Record<string, number>>(
					(acc, currencyTo) => ({
						...acc,
						[currencyTo]: getFakeRate(),
					}),
					{},
				);
				dbMock.setResponder("get", async (key) => {
					const currencyTo = key.split("->")[1]!;
					return fakeRates[currencyTo];
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					from: currencyFrom,
					to: currenciesTo,
				});
				expect(Object.keys(result).sort()).toStrictEqual<typeof currenciesTo>(
					[...currenciesTo].sort(),
				);
				expect(result).toStrictEqual<typeof result>(
					currenciesTo.reduce(
						(acc, currency) => ({ ...acc, [currency]: result[currency] }),
						{},
					),
				);
				const dbMessages = dbMock.getMessages();
				// Removing ping message
				expect(dbMessages.slice(1)).toStrictEqual<typeof dbMessages>([
					...currenciesTo.map<(typeof dbMessages)[number]>((currencyTo) => [
						"get",
						[`${currencyFrom}->${currencyTo}`],
						{ result: fakeRates[currencyTo] },
					]),
				]);
			});
		});

		test(`currencyCode casing is ignored`, async ({ ctx }) => {
			const dbMock = ctx.cacheDbOptions.mock!;
			dbMock.setResponder("get", async () => getFakeRate());
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const currencyFrom = "uSd";
			const currenciesTo = ["EUR", "mop", "VnD"];
			const result = await caller.procedure({
				from: currencyFrom,
				to: currenciesTo,
			});
			expect(Object.keys(result).sort()).toStrictEqual<typeof currenciesTo>(
				[...currenciesTo].map((code) => code.toUpperCase()).sort(),
			);
		});
	});
});
