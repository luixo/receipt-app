import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccountWithSession,
	insertDebt,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MONTH } from "~utils";
import { t } from "~web/handlers/trpc";

import { procedure } from "./top-debts";

const router = t.router({ procedure });

describe("currency.rates", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("other account do not affect", async ({ ctx }) => {
			const { sessionId, userId } = await insertAccountWithSession(ctx);
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "EUR" });
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toEqual<typeof result>([]);
		});

		test("top debts currencies returned", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { userId: otherUserId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "GEL" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			// Outdated debts
			const currencyCodes: CurrencyCode[] = ["GEL", "USD", "EUR"];
			await Promise.all(
				currencyCodes.map((currencyCode) =>
					insertDebt(ctx, accountId, otherUserId, {
						currencyCode,
						timestamp: new Date(Date.now() - MONTH),
					}),
				),
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([
				{
					count: "3",
					currencyCode: "USD",
				},
				{
					count: "2",
					currencyCode: "EUR",
				},
				{
					count: "1",
					currencyCode: "GEL",
				},
			]);
		});
	});
});
