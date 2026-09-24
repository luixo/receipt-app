import { faker } from "@faker-js/faker";
import type { Selectable } from "kysely";
import { describe, expect } from "vitest";

import type { PeerId, UserId } from "~db/ids";
import type { DB } from "~db/types.gen";
import { createAuthContext } from "~tests/backend/utils/context";
import type { InsertedDebt, UserSettingsData } from "~tests/backend/utils/data";
import {
	assertDatabase,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertUser,
	insertUserWithSession,
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

type UserWithPeer = { id: UserId; foreignPeerId: PeerId };

const revertDebt = (debt: InsertedDebt, otherUser: UserWithPeer) => ({
	...debt,
	ownerUserId: otherUser.id,
	peerId: otherUser.foreignPeerId,
	amount: (-debt.amount).toFixed(4),
});

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("userConnectionIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				userId: faker.string.uuid(),
			}),
		);

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: "not a valid uuid",
							userId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							userId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakePeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: fakePeerId,
						userId: faker.string.uuid(),
					}),
				"NOT_FOUND",
				`Peer "${fakePeerId}" does not exist.`,
			);
		});

		test("peer is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertPeer(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: foreignPeerId,
						userId: faker.string.uuid(),
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${user.email}".`,
			);
		});

		test("peer is already connected to an  user", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId, email: foreignEmail } = await insertUser(ctx);
			const [{ id: peerId }] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						userId: faker.string.uuid(),
					}),
				"CONFLICT",
				`Peer "${peerId}" is already connected to an  user with email "${foreignEmail}".`,
			);
		});

		test("target  user is not registered", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			// Verify that other users don't affect error
			await insertUser(ctx);

			const fakeUserId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						userId: fakeUserId,
					}),
				"NOT_FOUND",
				`User with id "${fakeUserId}" does not exist.`,
			);
		});

		test("target intention is not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId, email: foreignEmail } = await insertUser(ctx);
			const { id: outerUserId } = await insertUser(ctx);
			const { id: selfToForeignPeerId } = await insertPeer(ctx, userId, {
				connectedUserId: foreignUserId,
			});
			await insertPeer(ctx, userId, {
				connectedUserId: outerUserId,
			});
			await insertPeer(ctx, foreignUserId, {
				connectedUserId: outerUserId,
			});
			await insertPeer(ctx, outerUserId, {
				connectedUserId: userId,
			});
			await insertPeer(ctx, outerUserId, {
				connectedUserId: foreignUserId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId: selfToForeignPeerId,
						userId: foreignUserId,
					}),
				"NOT_FOUND",
				`Intention from  user "${foreignEmail}" not found.`,
			);
		});
	});

	describe("functionality", () => {
		test("user connection intention is accepted", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const {
				id: foreignUserId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertUser(ctx);
			const { id: outerUserId } = await insertUser(ctx);
			const { id: selfToForeignPeerId } = await insertPeer(ctx, userId);
			await insertPeer(ctx, userId, {
				connectedUserId: outerUserId,
			});
			await insertPeer(ctx, foreignUserId, {
				connectedUserId: userId,
			});
			await insertPeer(ctx, foreignUserId, {
				connectedUserId: outerUserId,
			});
			await insertPeer(ctx, outerUserId, {
				connectedUserId: userId,
			});
			await insertPeer(ctx, outerUserId, {
				connectedUserId: foreignUserId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					peerId: selfToForeignPeerId,
					userId: foreignUserId,
				}),
			);
			expect(result).toStrictEqual<typeof result>({
				id: foreignUserId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			});
		});

		test("empty avatar url is returned", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const {
				id: foreignUserId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			} = await insertUser(ctx, { avatarUrl: null });
			const { id: selfToForeignPeerId } = await insertPeer(ctx, userId);
			await insertPeer(ctx, foreignUserId, {
				connectedUserId: userId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: selfToForeignPeerId,
				userId: foreignUserId,
			});
			expect(result).toStrictEqual<typeof result>({
				id: foreignUserId,
				email: foreignEmail,
				avatarUrl: foreignAvatarUrl,
			});
		});

		describe("auto-accepted debts", () => {
			const runAcceptDebtsTest = async (
				ctx: TestContext,
				settings: {
					self?: UserSettingsData;
					foreign?: UserSettingsData;
				},
				afterTest?: (data: {
					selfDebt: InsertedDebt;
					foreignDebt: InsertedDebt;
					selfUser: UserWithPeer;
					foreignUser: UserWithPeer;
					debts: Selectable<DB["debts"]>[];
				}) => void,
			) => {
				const { sessionId, userId: selfUserId } = await insertUserWithSession(
					ctx,
					{
						user: { settings: settings.self },
					},
				);
				const { id: selfToForeignPeerId } = await insertPeer(ctx, selfUserId);
				const { id: extraSelfForeignPeerId } = await insertPeer(
					ctx,
					selfUserId,
				);

				const { id: foreignUserId } = await insertUser(ctx, {
					settings: settings.foreign,
				});
				const { id: foreignToSelfPeerId } = await insertPeer(
					ctx,
					foreignUserId,
					{ connectedUserId: selfUserId },
				);
				const { id: extraForeignForeignPeerId } = await insertPeer(
					ctx,
					foreignUserId,
				);

				const selfDebt = await insertDebt(ctx, selfUserId, selfToForeignPeerId);
				const foreignDebt = await insertDebt(
					ctx,
					foreignUserId,
					foreignToSelfPeerId,
				);

				// Verify non-related debts don't get accepted
				await insertDebt(ctx, selfUserId, extraSelfForeignPeerId);
				await insertDebt(ctx, foreignUserId, extraForeignForeignPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						peerId: selfToForeignPeerId,
						userId: foreignUserId,
					}),
				);
				const database = assertDatabase(ctx);
				const debts = await database.selectFrom("debts").selectAll().execute();

				afterTest?.({
					selfDebt,
					foreignDebt,
					selfUser: {
						id: selfUserId,
						foreignPeerId: selfToForeignPeerId,
					},
					foreignUser: {
						id: foreignUserId,
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

			test("self  user auto accepts", async ({ ctx }) => {
				await runAcceptDebtsTest(
					ctx,
					{
						self: { manualAcceptDebts: false },
						foreign: { manualAcceptDebts: true },
					},
					({ foreignDebt, selfUser, debts }) => {
						const selfDebts = debts.filter(
							(debt) => debt.ownerUserId === selfUser.id,
						);
						expect(selfDebts).toContainEqual(revertDebt(foreignDebt, selfUser));
					},
				);
			});

			test("foreign  user auto accepts", async ({ ctx }) => {
				await runAcceptDebtsTest(
					ctx,
					{
						self: { manualAcceptDebts: true },
						foreign: { manualAcceptDebts: false },
					},
					({ selfDebt, foreignUser, debts }) => {
						const foreignDebts = debts.filter(
							(debt) => debt.ownerUserId === foreignUser.id,
						);
						expect(foreignDebts).toContainEqual(
							revertDebt(selfDebt, foreignUser),
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
					({ selfDebt, foreignDebt, selfUser, foreignUser, debts }) => {
						const foreignDebts = debts.filter(
							(debt) => debt.ownerUserId === foreignUser.id,
						);
						expect(foreignDebts).toContainEqual(
							revertDebt(selfDebt, foreignUser),
						);
						const selfDebts = debts.filter(
							(debt) => debt.ownerUserId === selfUser.id,
						);
						expect(selfDebts).toContainEqual(revertDebt(foreignDebt, selfUser));
					},
				);
			});
		});
	});
});
