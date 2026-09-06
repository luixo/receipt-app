import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
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
			const { sessionId } = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
					}),
				"NOT_FOUND",
				`No user found by id "${foreignUserId}".`,
			);
		});

		describe("foreign user is not fetched via connected receipt", () => {
			test("not connected to a local user", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					{
						accountId: foreignAccountId,
						publicName: faker.person.fullName(),
					},
					otherAccountId,
				]);
				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				await expectTRPCError(
					() => caller.procedure({ id: foreignUserId }),
					"NOT_FOUND",
					`No user found by id "${foreignUserId}".`,
				);
			});

			test("connected to a local user as a self account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: foreignSelfUserId }),
					"NOT_FOUND",
					`No user found by id "${foreignSelfUserId}".`,
				);
			});
		});
	});

	describe("functionality", () => {
		describe("own user", () => {
			test("with public name and connected account with avatar url", async ({
				ctx,
			}) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					id: foreignAccountId,
					email: foreignEmail,
					avatarUrl: foreignAvatarUrl,
				} = await insertAccount(ctx);
				// Verify other users do not interfere
				await insertUser(ctx, accountId);
				const [{ id: userId, name, publicName }] = await insertConnectedUsers(
					ctx,
					[
						{ accountId, publicName: faker.person.fullName() },
						foreignAccountId,
					],
				);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: userId });
				expect(result).toStrictEqual<typeof result>({
					id: userId,
					connectedAccount: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: foreignAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("with connected account without avatar url", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, email: foreignEmail } =
					await insertAccount(ctx, { avatarUrl: null });
				// Verify other users do not interfere
				await insertUser(ctx, accountId);
				const [{ id: userId, name }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: userId });
				expect(result).toStrictEqual<typeof result>({
					id: userId,
					connectedAccount: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					name,
					publicName: undefined,
				});
			});

			test("without public name and email", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				// Verify other users do not interfere
				await insertUser(ctx, accountId);
				const { id: userId, name } = await insertUser(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: userId });
				expect(result).toStrictEqual<typeof result>({
					id: userId,
					connectedAccount: undefined,
					name,
					publicName: undefined,
				});
			});
		});
	});
});
