import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get-name";

const router = t.router({ procedure });

describe("users.getName", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentUserId,
					}),
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
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("user name is fetched", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verify other users do not interfere
			await insertUser(ctx, accountId);
			const { id: userId, name } = await insertUser(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: userId });
			expect(result).toBe(name);
		});
	});
});
