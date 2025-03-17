import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import type { AccountsId, Debts, UsersId } from "~db/models";
import { createAuthContext } from "~tests/backend/utils/context";
import type {
	AccountSettingsData,
	InsertedDebt,
} from "~tests/backend/utils/data";
import {
	insertAccount,
	insertAccountConnectionIntention,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accept";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				userId: faker.string.uuid(),
				accountId: faker.string.uuid(),
			}),
		);

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: "not a valid uuid",
							accountId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid uuid`,
				);
			});
		});

		describe("accountId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							accountId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "accountId": Invalid uuid`,
				);
			});
		});

		test("user does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						userId: fakeUserId,
						accountId: faker.string.uuid(),
					}),
				"NOT_FOUND",
				`User "${fakeUserId}" does not exist.`,
			);
		});

		test("user is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						userId: foreignUserId,
						accountId: faker.string.uuid(),
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${account.email}".`,
			);
		});

		test("user is already connected to an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			const [{ id: userId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						userId,
						accountId: faker.string.uuid(),
					}),
				"CONFLICT",
				`User "${userId}" is already connected to an account with email "${foreignEmail}".`,
			);
		});

		test("target account is not registered", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify that other accounts don't affect error
			await insertAccount(ctx);

			const fakeAccountId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						userId,
						accountId: fakeAccountId,
					}),
				"NOT_FOUND",
				`Account with id "${fakeAccountId}" does not exist.`,
			);
		});

		test("target intention is not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: selfToForeignUserId } = await insertUser(ctx, accountId);
			const { id: selfToOuterUserId } = await insertUser(ctx, accountId);

			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
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
						userId: selfToForeignUserId,
						accountId: foreignAccountId,
					}),
				"NOT_FOUND",
				`Intention from account "${foreignEmail}" not found.`,
			);
		});
	});

	describe("functionality", () => {
		test("account connection intention is accepted", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: selfToForeignUserId } = await insertUser(ctx, accountId);
			const { id: selfToOuterUserId } = await insertUser(ctx, accountId);

			const {
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertAccount(ctx);
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
				caller.procedure({
					userId: selfToForeignUserId,
					accountId: foreignAccountId,
				}),
			);
			expect(result).toStrictEqual<typeof result>({
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			});
		});

		test("empty avatar url is returned", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: selfToForeignUserId } = await insertUser(ctx, accountId);

			const {
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertAccount(ctx, { avatarUrl: null });
			const { id: foreignToSelfUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);

			await insertAccountConnectionIntention(
				ctx,
				foreignAccountId,
				accountId,
				foreignToSelfUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				userId: selfToForeignUserId,
				accountId: foreignAccountId,
			});
			expect(result).toStrictEqual<typeof result>({
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			});
		});

		describe("auto-accepted debts", () => {
			type AccountWithUser = { id: AccountsId; foreignUserId: UsersId };

			const revertDebt = (
				debt: InsertedDebt,
				otherAccount: AccountWithUser,
			) => ({
				...debt,
				ownerAccountId: otherAccount.id,
				userId: otherAccount.foreignUserId,
				amount: (-debt.amount).toFixed(4),
			});

			const runAcceptDebtsTest = async (
				ctx: TestContext,
				settings: {
					self?: AccountSettingsData;
					foreign?: AccountSettingsData;
				},
				afterTest?: (data: {
					selfDebt: InsertedDebt;
					foreignDebt: InsertedDebt;
					selfAccount: AccountWithUser;
					foreignAccount: AccountWithUser;
					debts: Debts[];
				}) => void,
			) => {
				const { sessionId, accountId: selfAccountId } =
					await insertAccountWithSession(ctx, {
						account: { settings: settings.self },
					});
				const { id: selfToForeignUserId } = await insertUser(
					ctx,
					selfAccountId,
				);
				const { id: extraSelfForeignUserId } = await insertUser(
					ctx,
					selfAccountId,
				);

				const { id: foreignAccountId } = await insertAccount(ctx, {
					settings: settings.foreign,
				});
				const { id: foreignToSelfUserId } = await insertUser(
					ctx,
					foreignAccountId,
				);
				const { id: extraForeignForeignUserId } = await insertUser(
					ctx,
					foreignAccountId,
				);

				const selfDebt = await insertDebt(
					ctx,
					selfAccountId,
					selfToForeignUserId,
				);
				const foreignDebt = await insertDebt(
					ctx,
					foreignAccountId,
					foreignToSelfUserId,
				);

				// Verify non-related debts don't get accepted
				await insertDebt(ctx, selfAccountId, extraSelfForeignUserId);
				await insertDebt(ctx, foreignAccountId, extraForeignForeignUserId);

				await insertAccountConnectionIntention(
					ctx,
					foreignAccountId,
					selfAccountId,
					foreignToSelfUserId,
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						userId: selfToForeignUserId,
						accountId: foreignAccountId,
					}),
				);
				const debts = await ctx.database
					.selectFrom("debts")
					.selectAll()
					.execute();

				afterTest?.({
					selfDebt,
					foreignDebt,
					selfAccount: {
						id: selfAccountId,
						foreignUserId: selfToForeignUserId,
					},
					foreignAccount: {
						id: foreignAccountId,
						foreignUserId: foreignToSelfUserId,
					},
					debts,
				});
			};

			test("none are auto-accepted", async ({ ctx }) => {
				await runAcceptDebtsTest(ctx, {
					self: { manualAcceptDebts: true },
					foreign: { manualAcceptDebts: true },
				});
			});

			test("self account auto accepts", async ({ ctx }) => {
				await runAcceptDebtsTest(
					ctx,
					{
						self: { manualAcceptDebts: false },
						foreign: { manualAcceptDebts: true },
					},
					({ foreignDebt, selfAccount, debts }) => {
						const selfDebts = debts.filter(
							(debt) => debt.ownerAccountId === selfAccount.id,
						);
						expect(selfDebts).toContainEqual(
							revertDebt(foreignDebt, selfAccount),
						);
					},
				);
			});

			test("foreign account auto accepts", async ({ ctx }) => {
				await runAcceptDebtsTest(
					ctx,
					{
						self: { manualAcceptDebts: true },
						foreign: { manualAcceptDebts: false },
					},
					({ selfDebt, foreignAccount, debts }) => {
						const foreignDebts = debts.filter(
							(debt) => debt.ownerAccountId === foreignAccount.id,
						);
						expect(foreignDebts).toContainEqual(
							revertDebt(selfDebt, foreignAccount),
						);
					},
				);
			});

			test("both are auto-accepted", async ({ ctx }) => {
				await runAcceptDebtsTest(
					ctx,
					{
						self: { manualAcceptDebts: false },
						foreign: { manualAcceptDebts: false },
					},
					({ selfDebt, foreignDebt, selfAccount, foreignAccount, debts }) => {
						const foreignDebts = debts.filter(
							(debt) => debt.ownerAccountId === foreignAccount.id,
						);
						expect(foreignDebts).toContainEqual(
							revertDebt(selfDebt, foreignAccount),
						);
						const selfDebts = debts.filter(
							(debt) => debt.ownerAccountId === selfAccount.id,
						);
						expect(selfDebts).toContainEqual(
							revertDebt(foreignDebt, selfAccount),
						);
					},
				);
			});
		});
	});
});
