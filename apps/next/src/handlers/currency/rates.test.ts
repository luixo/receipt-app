import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import type { CacheDbOptionsMock } from "next-tests/utils/mocks/cache-db";
import { test } from "next-tests/utils/test";

import { procedure } from "./rates";

const router = t.router({ procedure });

const getFakeRate = () => Number(faker.finance.amount(0.01, 100));

describe("currency.rates", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ from: "", to: [] }),
		);

		test(`invalid "from" currency code`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "foo", to: ["USD"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "from": Invalid input`,
			);
		});

		test(`invalid "to" currency code`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["USD", "bar"] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to[1]": Invalid input`,
			);
		});

		test(`invalid "to" codes amount`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: [] }),
				"BAD_REQUEST",
				`Zod error\n\nAt "to": Array must contain at least 1 element(s)`,
			);
		});

		test(`"to" and "from" codes are the same`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ from: "EUR", to: ["EUR", "USD"] }),
				"BAD_REQUEST",
				`Currency code "from" and "to" must be different`,
			);
		});
	});

	describe("functionality", () => {
		describe("cache db throws", () => {
			test(`on get request`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				dbMock.setResponder("get", async () => {
					throw new Error('Throw on "get" request');
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

			test("exchange rate provider have empty data", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(async () => ({}));
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							from: "USD",
							to: ["EUR", "MOP", "VND"],
						}),
					"INTERNAL_SERVER_ERROR",
					'Code "USD" is not available on remote server. Please contact app owner.',
				);
			});

			test("exchange rate provider have semi-full data", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				respondAsEmptyCache(dbMock);
				ctx.exchangeRateOptions.mock.addInterceptor(async (_, to) => ({
					[String(to[0])]: getFakeRate(),
				}));
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							from: "USD",
							to: ["EUR", "MOP", "VND"],
						}),
					"INTERNAL_SERVER_ERROR",
					'Codes "MOP", "VND" are not available on remote server. Please contact app owner.',
				);
			});

			test("exchange rate returned", async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				respondAsEmptyCache(dbMock);
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					from: "USD",
					to: ["EUR", "MOP", "VND"],
				});
				expect(result).toMatchSnapshot();
				expect(dbMock.getMessages()).toMatchSnapshot();
			});
		});

		describe("cache has required data", () => {
			test(`exchange rate returned`, async ({ ctx }) => {
				const dbMock = ctx.cacheDbOptions.mock!;
				dbMock.setResponder("get", async (key) => {
					const toCurrencies = key.split("->")[1]!.split(",");
					return toCurrencies.reduce(
						(acc, currency) => ({ ...acc, [currency]: getFakeRate() }),
						{},
					);
				});
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					from: "USD",
					to: ["EUR", "MOP", "VND"],
				});
				expect(result).toMatchSnapshot();
			});
		});
	});
});
