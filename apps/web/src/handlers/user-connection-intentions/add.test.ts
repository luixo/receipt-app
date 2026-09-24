import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
	insertUser,
	insertUserWithSession,
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

describe("userConnectionIntentions.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				email: faker.internet.email(),
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
							email: faker.internet.email(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
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
			const { sessionId } = await insertUserWithSession(ctx);
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
						email: faker.internet.email(),
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${user.email}".`,
			);
		});

		test("target  user is not registered", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			// Verify that other users don't affect error
			await insertUser(ctx);

			const fakeEmail = faker.internet.email();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						peerId,
						email: fakeEmail,
					}),
				"NOT_FOUND",
				`User with email "${fakeEmail}" does not exist.`,
			);
		});

		describe("email connection intention exceptions", () => {
			test("target peer already has a connected  user", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx);
				const [{ id: peerId }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				// Verify that other peers don't affect error
				await insertPeer(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: faker.internet.email(),
						}),
					"CONFLICT",
					`Peer "${peerId}" is already connected to  user "${otherEmail}".`,
				);
			});

			test("target email is already connected as another peer", async ({
				ctx,
			}) => {
				const { userId, sessionId } = await insertUserWithSession(ctx);
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx);
				const [{ name: peerName }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);

				const { id: peerId } = await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId,
							email: otherEmail,
						}),
					"CONFLICT",
					`User with email "${otherEmail}" is already connected to peer "${peerName}".`,
				);
			});

			test("target peer already has an intention", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: otherUserId } = await insertUser(ctx);
				const { email: targetEmail } = await insertUser(ctx);
				const { id: peerId, name: peerName } = await insertPeer(ctx, userId, {
					connectedUserId: otherUserId,
				});

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

			test("target  user already has an intention", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx);
				const { name: peerName } = await insertPeer(ctx, userId, {
					connectedUserId: otherUserId,
				});

				const { id: peerId } = await insertPeer(ctx, userId);

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
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertUser(ctx);

				const { id: peerId } = await insertPeer(ctx, userId);
				const { id: anotherPeerId } = await insertPeer(ctx, userId);

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
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertUser(ctx);
				const { email: anotherEmail } = await insertUser(ctx);

				const { id: peerId } = await insertPeer(ctx, userId);

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
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				const {
					email: otherEmail,
					id: otherUserId,
					avatarUrl: otherAvatarUrl,
				} = await insertUser(ctx);

				const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

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
					user: {
						id: otherUserId,
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
		describe("user connection intention collapse - has a vice versa intention", () => {
			test("avatar url exists", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const {
					id: otherUserId,
					email: otherEmail,
					avatarUrl: otherAvatarUrl,
				} = await insertUser(ctx);

				await insertPeer(ctx, otherUserId, {
					connectedUserId: userId,
				});

				const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ peerId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					user: {
						id: otherUserId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: true,
					peer: { name: peerName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx, {
					avatarUrl: null,
				});

				await insertPeer(ctx, otherUserId, {
					connectedUserId: userId,
				});

				const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ peerId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					user: {
						id: otherUserId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					peer: { name: peerName },
				});
			});
		});

		describe("user connection intention added", () => {
			test("avatar url exists", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const {
					email: otherEmail,
					id: otherUserId,
					avatarUrl: otherAvatarUrl,
				} = await insertUser(ctx);

				const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ peerId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					user: {
						id: otherUserId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: false,
					peer: { name: peerName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { email: otherEmail, id: otherUserId } = await insertUser(ctx, {
					avatarUrl: null,
				});

				const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ peerId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					user: {
						id: otherUserId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: false,
					peer: { name: peerName },
				});
			});
		});

		test("multiple intentions", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			const { id: otherUserId, email: otherEmail } = await insertUser(ctx, {
				avatarUrl: null,
			});

			await insertPeer(ctx, otherUserId, { connectedUserId: userId });

			const { id: peerId, name: peerName } = await insertPeer(ctx, userId);

			const { email: anotherEmail, id: anotherUserId } = await insertUser(ctx, {
				avatarUrl: null,
			});

			const { id: anotherPeerId, name: anotherPeerName } = await insertPeer(
				ctx,
				userId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await runInBand([
				() => caller.procedure({ peerId, email: otherEmail }),
				() => caller.procedure({ peerId: anotherPeerId, email: anotherEmail }),
			]);
			expect(results).toStrictEqual<typeof results>([
				{
					user: {
						id: otherUserId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					peer: { name: peerName },
				},
				{
					user: {
						id: anotherUserId,
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
