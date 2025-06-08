import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./unlink";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.unlink", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: nonExistentUserId }),
				"NOT_FOUND",
				`No user found by id "${nonExistentUserId}".`,
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
				() => caller.procedure({ id: foreignUserId }),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});

		test("user is not connected to the account", async ({ ctx }) => {
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			// Connected account
			await insertConnectedUsers(ctx, [accountId, otherAccountId]);
			// Not connected account
			const { id: notConnectedUserId } = await insertUser(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: notConnectedUserId }),
				"NOT_FOUND",
				`User "${notConnectedUserId}" doesn't have account connected to it.`,
			);
		});
	});

	describe("functionality", () => {
		test("account is unlinked from a user", async ({ ctx }) => {
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			// Connected account
			const [{ id: connectedUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				otherAccountId,
			]);
			// Verify other users are not affected
			await insertUser(ctx, accountId);
			await insertUser(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: connectedUserId }),
			);
		});
	});
});
