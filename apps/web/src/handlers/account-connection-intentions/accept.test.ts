import { faker } from "@faker-js/faker";
import type { Selectable } from "kysely";
import { describe, expect } from "vitest";

import type { AccountId, PeerId } from "~db/ids";
import type { DB } from "~db/types.gen";
import { createAuthContext } from "~tests/backend/utils/context";
import type {
	AccountSettingsData,
	InsertedDebt,
} from "~tests/backend/utils/data";
import {
	assertDatabase,
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
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

type AccountWithPeer = { id: AccountId; foreignPeerId: PeerId };

const revertDebt = (debt: InsertedDebt, otherAccount: AccountWithPeer) => ({
	...debt,
	ownerAccountId: otherAccount.id,
	peerId: otherAccount.foreignPeerId,
	amount: (-debt.amount).toFixed(4),
});

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				accountId: faker.string.uuid(),
			}),
		);

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: "not a valid uuid",
							accountId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
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
							peerId: faker.string.uuid(),
							accountId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "accountId": Invalid UUID`,
				);
			});
		});

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakePeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: fakePeerId,
						accountId: faker.string.uuid(),
					}),
				"NOT_FOUND",
				`Peer "${fakePeerId}" does not exist.`,
			);
		});

		test("peer is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } =
				await insertAccountWithSession(ctx);
			await insertPeer(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: foreignPeerId,
						accountId: faker.string.uuid(),
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${account.email}".`,
			);
		});

		test("peer is already connected to an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } =
				await insertAccount(ctx);
			const [{ id: peerId }] = await insertConnectedPeers(ctx, [
				accountId,
				foreignAccountId,
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						accountId: faker.string.uuid(),
					}),
				"CONFLICT",
				`Peer "${peerId}" is already connected to an account with email "${foreignEmail}".`,
			);
		});

		test("target account is not registered", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify that other accounts don't affect error
			await insertAccount(ctx);

			const fakeAccountId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						accountId: fakeAccountId,
					}),
				"NOT_FOUND",
				`Account with id "${fakeAccountId}" does not exist.`,
			);
		});

		test("target intention is not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } =
				await insertAccount(ctx);
			const { id: outerAccountId } = await insertAccount(ctx);
			const { id: selfToForeignPeerId } = await insertPeer(ctx, accountId, {
				connectedAccountId: foreignAccountId,
			});
			await insertPeer(ctx, accountId, {
				connectedAccountId: outerAccountId,
			});
			await insertPeer(ctx, foreignAccountId, {
				connectedAccountId: outerAccountId,
			});
			await insertPeer(ctx, outerAccountId, {
				connectedAccountId: accountId,
			});
			await insertPeer(ctx, outerAccountId, {
				connectedAccountId: foreignAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: selfToForeignPeerId,
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
			const {
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertAccount(ctx);
			const { id: outerAccountId } = await insertAccount(ctx);
			const { id: selfToForeignPeerId } = await insertPeer(ctx, accountId);
			await insertPeer(ctx, accountId, {
				connectedAccountId: outerAccountId,
			});
			await insertPeer(ctx, foreignAccountId, {
				connectedAccountId: accountId,
			});
			await insertPeer(ctx, foreignAccountId, {
				connectedAccountId: outerAccountId,
			});
			await insertPeer(ctx, outerAccountId, {
				connectedAccountId: accountId,
			});
			await insertPeer(ctx, outerAccountId, {
				connectedAccountId: foreignAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					peerId: selfToForeignPeerId,
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
			const {
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertAccount(ctx, { avatarUrl: null });
			const { id: selfToForeignPeerId } = await insertPeer(ctx, accountId);
			await insertPeer(ctx, foreignAccountId, {
				connectedAccountId: accountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: selfToForeignPeerId,
				accountId: foreignAccountId,
			});
			expect(result).toStrictEqual<typeof result>({
				id: foreignAccountId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			});
		});

		describe("auto-accepted debts", () => {
			const runAcceptDebtsTest = async (
				ctx: TestContext,
				settings: {
					self?: AccountSettingsData;
					foreign?: AccountSettingsData;
				},
				afterTest?: (data: {
					selfDebt: InsertedDebt;
					foreignDebt: InsertedDebt;
					selfAccount: AccountWithPeer;
					foreignAccount: AccountWithPeer;
					debts: Selectable<DB["debts"]>[];
				}) => void,
			) => {
				const { sessionId, accountId: selfAccountId } =
					await insertAccountWithSession(ctx, {
						account: { settings: settings.self },
					});
				const { id: selfToForeignPeerId } = await insertPeer(
					ctx,
					selfAccountId,
				);
				const { id: extraSelfForeignPeerId } = await insertPeer(
					ctx,
					selfAccountId,
				);

				const { id: foreignAccountId } = await insertAccount(ctx, {
					settings: settings.foreign,
				});
				const { id: foreignToSelfPeerId } = await insertPeer(
					ctx,
					foreignAccountId,
					{ connectedAccountId: selfAccountId },
				);
				const { id: extraForeignForeignPeerId } = await insertPeer(
					ctx,
					foreignAccountId,
				);

				const selfDebt = await insertDebt(
					ctx,
					selfAccountId,
					selfToForeignPeerId,
				);
				const foreignDebt = await insertDebt(
					ctx,
					foreignAccountId,
					foreignToSelfPeerId,
				);

				// Verify non-related debts don't get accepted
				await insertDebt(ctx, selfAccountId, extraSelfForeignPeerId);
				await insertDebt(ctx, foreignAccountId, extraForeignForeignPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						peerId: selfToForeignPeerId,
						accountId: foreignAccountId,
					}),
				);
				const database = assertDatabase(ctx);
				const debts = await database.selectFrom("debts").selectAll().execute();

				afterTest?.({
					selfDebt,
					foreignDebt,
					selfAccount: {
						id: selfAccountId,
						foreignPeerId: selfToForeignPeerId,
					},
					foreignAccount: {
						id: foreignAccountId,
						foreignPeerId: foreignToSelfPeerId,
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
