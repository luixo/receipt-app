import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountConnectionIntention,
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

import { procedure } from "./reject";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.reject", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				sourceAccountId: faker.string.uuid(),
			}),
		);

		describe("sourceAccountId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							sourceAccountId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "sourceAccountId": Invalid uuid`,
				);
			});
		});

		test("source account is not registered", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);

			// Verify that other accounts don't affect error
			await insertAccount(ctx);

			const fakeAccountId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						sourceAccountId: fakeAccountId,
					}),
				"NOT_FOUND",
				`Intention from account id "${fakeAccountId}" not found.`,
			);
		});

		test("source intention is not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const { id: selfToForeignUserId } = await insertUser(ctx, accountId);
			const { id: selfToOuterUserId } = await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignToOuterUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);

			const { id: outerAccountId } = await insertAccount(ctx);
			const { id: outerToSelfUserId } = await insertUser(ctx, outerAccountId);
			const { id: outerToForeignUserId } = await insertUser(
				ctx,
				outerAccountId,
			);

			// Verify other account connection intentions don't affect error
			await insertAccountConnectionIntention(
				ctx,
				accountId,
				foreignAccountId,
				selfToForeignUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				accountId,
				outerAccountId,
				selfToOuterUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				outerAccountId,
				accountId,
				outerToSelfUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				foreignAccountId,
				outerAccountId,
				foreignToOuterUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				outerAccountId,
				foreignAccountId,
				outerToForeignUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						sourceAccountId: foreignAccountId,
					}),
				"NOT_FOUND",
				`Intention from account id "${foreignAccountId}" not found.`,
			);
		});
	});

	describe("functionality", () => {
		test("account connection intention is rejected", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: selfToOuterUserId } = await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignToSelfUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			const { id: foreignToOuterUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);

			const { id: outerAccountId } = await insertAccount(ctx);
			const { id: outerToSelfUserId } = await insertUser(ctx, outerAccountId);
			const { id: outerToForeignUserId } = await insertUser(
				ctx,
				outerAccountId,
			);

			await insertAccountConnectionIntention(
				ctx,
				foreignAccountId,
				accountId,
				foreignToSelfUserId,
			);

			// Verify other account connection intentions don't affect error
			await insertAccountConnectionIntention(
				ctx,
				accountId,
				outerAccountId,
				selfToOuterUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				outerAccountId,
				accountId,
				outerToSelfUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				foreignAccountId,
				outerAccountId,
				foreignToOuterUserId,
			);
			await insertAccountConnectionIntention(
				ctx,
				outerAccountId,
				foreignAccountId,
				outerToForeignUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ sourceAccountId: foreignAccountId }),
			);
			expect(result).toBeUndefined();
		});
	});
});
