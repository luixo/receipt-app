import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertPeer,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				email: faker.internet.email(),
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
							email: faker.internet.email(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							email: "invalid@@mail.org",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
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
						email: faker.internet.email(),
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
						email: faker.internet.email(),
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${account.email}".`,
			);
		});

		test("target account is not registered", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify that other accounts don't affect error
			await insertAccount(ctx);

			const fakeEmail = faker.internet.email();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						email: fakeEmail,
					}),
				"NOT_FOUND",
				`Account with email "${fakeEmail}" does not exist.`,
			);
		});

		describe("email connection intention exceptions", () => {
			test("target peer already has a connected account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const [{ id: peerId }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);
				// Verify that other peers don't affect error
				await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: faker.internet.email(),
						}),
					"CONFLICT",
					`Peer "${peerId}" is already connected to account "${otherEmail}".`,
				);
			});

			test("target email is already connected as another peer", async ({
				ctx,
			}) => {
				const { accountId, sessionId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const [{ name: peerName }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);

				const { id: peerId } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: otherEmail,
						}),
					"CONFLICT",
					`Account with email "${otherEmail}" is already connected to peer "${peerName}".`,
				);
			});

			test("target peer already has an intention", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { email: targetEmail } = await insertAccount(ctx);
				const { id: peerId, name: peerName } = await insertPeer(
					ctx,
					accountId,
					{ connectedAccountId: otherAccountId },
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: targetEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to peer "${peerName}".`,
				);
			});

			test("target account already has an intention", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const { name: peerName } = await insertPeer(ctx, accountId, {
					connectedAccountId: otherAccountId,
				});

				const { id: peerId } = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: otherEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to "${otherEmail}" as peer "${peerName}".`,
				);
			});
		});

		describe("multiple intentions", () => {
			test("duplicate emails", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertAccount(ctx);

				const { id: peerId } = await insertPeer(ctx, accountId);
				const { id: anotherPeerId } = await insertPeer(ctx, accountId);

				await expectTRPCError(
					() =>
						runInBand([
							() => caller.procedure({ peerId, email: otherEmail }),
							() =>
								caller.procedure({
									peerId: anotherPeerId,
									email: otherEmail,
								}),
						]),
					"CONFLICT",
					`Expected to have unique emails, got repeating emails: "${otherEmail}" (2 times).`,
				);
			});

			test("duplicate peer ids", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertAccount(ctx);
				const { email: anotherEmail } = await insertAccount(ctx);

				const { id: peerId } = await insertPeer(ctx, accountId);

				await expectTRPCError(
					() =>
						runInBand([
							() => caller.procedure({ peerId, email: otherEmail }),
							() => caller.procedure({ peerId, email: anotherEmail }),
						]),
					"CONFLICT",
					`Expected to have unique peer ids, got repeating: "${peerId}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const {
					email: otherEmail,
					id: otherAccountId,
					avatarUrl: otherAvatarUrl,
				} = await insertAccount(ctx);

				const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runInBand([
						() => caller.procedure({ peerId, email: otherEmail }),
						() =>
							caller
								.procedure({
									peerId: "not a valid uuid",
									email: faker.internet.email(),
								})
								.catch((error) => error),
					]),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: false,
					peer: { name: peerName },
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});

	describe("functionality", () => {
		describe("account connection intention collapse - has a vice versa intention", () => {
			test("avatar url exists", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					id: otherAccountId,
					email: otherEmail,
					avatarUrl: otherAvatarUrl,
				} = await insertAccount(ctx);

				await insertPeer(ctx, otherAccountId, {
					connectedAccountId: accountId,
				});

				const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ peerId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: true,
					peer: { name: peerName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } = await insertAccount(
					ctx,
					{ avatarUrl: null },
				);

				await insertPeer(ctx, otherAccountId, {
					connectedAccountId: accountId,
				});

				const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ peerId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					peer: { name: peerName },
				});
			});
		});

		describe("account connection intention added", () => {
			test("avatar url exists", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					email: otherEmail,
					id: otherAccountId,
					avatarUrl: otherAvatarUrl,
				} = await insertAccount(ctx);

				const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ peerId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: false,
					peer: { name: peerName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { email: otherEmail, id: otherAccountId } = await insertAccount(
					ctx,
					{ avatarUrl: null },
				);

				const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ peerId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: false,
					peer: { name: peerName },
				});
			});
		});

		test("multiple intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const { id: otherAccountId, email: otherEmail } = await insertAccount(
				ctx,
				{ avatarUrl: null },
			);

			await insertPeer(ctx, otherAccountId, { connectedAccountId: accountId });

			const { id: peerId, name: peerName } = await insertPeer(ctx, accountId);

			const { email: anotherEmail, id: anotherAccountId } = await insertAccount(
				ctx,
				{ avatarUrl: null },
			);

			const { id: anotherPeerId, name: anotherPeerName } = await insertPeer(
				ctx,
				accountId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await runInBand([
				() => caller.procedure({ peerId, email: otherEmail }),
				() => caller.procedure({ peerId: anotherPeerId, email: anotherEmail }),
			]);
			expect(results).toStrictEqual<typeof results>([
				{
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					peer: { name: peerName },
				},
				{
					account: {
						id: anotherAccountId,
						email: anotherEmail,
						avatarUrl: undefined,
					},
					connected: false,
					peer: { name: anotherPeerName },
				},
			]);
		});
	});
});
