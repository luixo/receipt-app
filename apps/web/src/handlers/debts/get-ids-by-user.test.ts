import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-ids-by-user";

const mapDebt = (debt: Awaited<ReturnType<typeof insertDebt>>) => ({
	id: debt.id,
	timestamp: debt.timestamp,
});

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getIdsByUser", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ userId: faker.string.uuid() }),
		);

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ userId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid uuid`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakerUserId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ userId: fakerUserId }),
				"NOT_FOUND",
				`User "${fakerUserId}" does not exist.`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ userId: foreignUserId }),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("user debts", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const syncedDebts = await Promise.all([
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
				),
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
				),
				insertSyncedDebts(
					ctx,
					[accountId, userId],
					[foreignAccountId, foreignToSelfUserId],
					{ ahead: "their" },
				),
			]);
			const userDebts = await Promise.all([
				insertDebt(ctx, accountId, userId),
				insertDebt(ctx, accountId, userId),
			]);

			// Verify other users and accounts don't affect the result
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, anotherUserId);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ userId });
			expect(result).toStrictEqual<typeof result>(
				[
					...userDebts.map(mapDebt),
					...syncedDebts.map(([ours]) => mapDebt(ours)),
				].sort((a, b) => {
					const timestampSort = a.timestamp.valueOf() - b.timestamp.valueOf();
					if (timestampSort !== 0) {
						return timestampSort;
					}
					return a.id.localeCompare(b.id);
				}),
			);
		});
	});
});
