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
					`Zod error\n\nAt "targetAccountId": Invalid uuid`,
				);
			});
		});

		test("target intention is not found", async ({ ctx }) => {
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

			// Verify other account connection intentions don't affect error
			await insertAccountConnectionIntention(
				ctx,
				foreignAccountId,
				accountId,
				foreignToSelfUserId,
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
			const { id: selfToOuterUserId } = await insertUser(ctx, accountId);
			const { id: selfToForeignUserId } = await insertUser(ctx, accountId);

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

			await insertAccountConnectionIntention(
				ctx,
				accountId,
				foreignAccountId,
				selfToForeignUserId,
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
				caller.procedure({ targetAccountId: foreignAccountId }),
			);
			await expect(result).toBeUndefined();
		});
	});
});
