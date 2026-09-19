import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./remove";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				targetAccountId: faker.string.uuid(),
			}),
		);

		describe("targetAccountId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetAccountId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "targetAccountId": Invalid UUID`,
				);
			});
		});

		test("target intention is not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: outerAccountId } = await insertAccount(ctx);
			await insertUser(ctx, accountId, {
				connectedAccountId: outerAccountId,
			});
			await insertUser(ctx, foreignAccountId, {
				connectedAccountId: accountId,
			});
			await insertUser(ctx, foreignAccountId, {
				connectedAccountId: outerAccountId,
			});
			await insertUser(ctx, outerAccountId, {
				connectedAccountId: accountId,
			});
			await insertUser(ctx, outerAccountId, {
				connectedAccountId: foreignAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetAccountId: foreignAccountId,
					}),
				"NOT_FOUND",
				`Intention for account id "${foreignAccountId}" not found.`,
			);
		});
	});

	describe("functionality", () => {
		test("account connection intention is removed", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: outerAccountId } = await insertAccount(ctx);
			await insertUser(ctx, accountId, {
				connectedAccountId: outerAccountId,
			});
			await insertUser(ctx, accountId, {
				connectedAccountId: foreignAccountId,
			});
			await insertUser(ctx, foreignAccountId, {
				connectedAccountId: outerAccountId,
			});
			await insertUser(ctx, outerAccountId, {
				connectedAccountId: accountId,
			});
			await insertUser(ctx, outerAccountId, {
				connectedAccountId: foreignAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ targetAccountId: foreignAccountId }),
			);
			expect(result).toStrictEqual<typeof result>(undefined);
		});
	});
});
