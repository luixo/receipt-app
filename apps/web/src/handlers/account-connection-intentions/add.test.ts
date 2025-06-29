import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountConnectionIntention,
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
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("accountConnectionIntentions.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				userId: faker.string.uuid(),
				email: faker.internet.email(),
			}),
		);

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: "not a valid uuid",
							email: faker.internet.email(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId: faker.string.uuid(),
							email: "invalid@@mail.org",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		test("user does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const fakeUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						userId: fakeUserId,
						email: faker.internet.email(),
					}),
				"NOT_FOUND",
				`User "${fakeUserId}" does not exist.`,
			);
		});

		test("user is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } =
				await insertAccountWithSession(ctx);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						userId: foreignUserId,
						email: faker.internet.email(),
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${account.email}".`,
			);
		});

		test("target account is not registered", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify that other accounts don't affect error
			await insertAccount(ctx);

			const fakeEmail = faker.internet.email();
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						userId,
						email: fakeEmail,
					}),
				"NOT_FOUND",
				`Account with email "${fakeEmail}" does not exist.`,
			);
		});

		describe("email connection intention exceptions", () => {
			test("target user already has a connected account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const [{ id: userId }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				// Verify that other users don't affect error
				await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId,
							email: faker.internet.email(),
						}),
					"CONFLICT",
					`User "${userId}" is already connected to account "${otherEmail}".`,
				);
			});

			test("target email is already connected as another user", async ({
				ctx,
			}) => {
				const { accountId, sessionId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const [{ name: userName }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);

				const { id: userId } = await insertUser(ctx, accountId);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId,
							email: otherEmail,
						}),
					"CONFLICT",
					`Account with email "${otherEmail}" is already connected to user "${userName}".`,
				);
			});

			test("target user already has an intention", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { email: targetEmail } = await insertAccount(ctx);
				const { id: userId, name: userName } = await insertUser(ctx, accountId);
				// Self account's intention to connect to foreign account
				await insertAccountConnectionIntention(
					ctx,
					accountId,
					otherAccountId,
					userId,
				);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId,
							email: targetEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to user "${userName}".`,
				);
			});

			test("target account already has an intention", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } =
					await insertAccount(ctx);
				const { id: previousUserId, name: userName } = await insertUser(
					ctx,
					accountId,
				);
				// Self account's intention to connect to foreign account
				await insertAccountConnectionIntention(
					ctx,
					accountId,
					otherAccountId,
					previousUserId,
				);

				const { id: userId } = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							userId,
							email: otherEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to "${otherEmail}" as user "${userName}".`,
				);
			});
		});

		describe("multiple intentions", () => {
			test("duplicate emails", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertAccount(ctx);

				const { id: userId } = await insertUser(ctx, accountId);
				const { id: anotherUserId } = await insertUser(ctx, accountId);

				await expectTRPCError(
					() =>
						runInBand([
							() => caller.procedure({ userId, email: otherEmail }),
							() =>
								caller.procedure({
									userId: anotherUserId,
									email: otherEmail,
								}),
						]),
					"CONFLICT",
					`Expected to have unique emails, got repeating emails: "${otherEmail}" (2 times).`,
				);
			});

			test("duplicate user ids", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));

				const { email: otherEmail } = await insertAccount(ctx);
				const { email: anotherEmail } = await insertAccount(ctx);

				const { id: userId } = await insertUser(ctx, accountId);

				await expectTRPCError(
					() =>
						runInBand([
							() => caller.procedure({ userId, email: otherEmail }),
							() => caller.procedure({ userId, email: anotherEmail }),
						]),
					"CONFLICT",
					`Expected to have unique user ids, got repeating: "${userId}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));

				const {
					email: otherEmail,
					id: otherAccountId,
					avatarUrl: otherAvatarUrl,
				} = await insertAccount(ctx);

				const { id: userId, name: userName } = await insertUser(ctx, accountId);

				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runInBand([
						() => caller.procedure({ userId, email: otherEmail }),
						() =>
							caller
								.procedure({
									userId: "not a valid uuid",
									email: faker.internet.email(),
								})
								.catch((e) => e),
					]),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: false,
					user: { name: userName },
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

				const { id: otherUserId } = await insertUser(ctx, otherAccountId);
				// Foreign account's intention to connect to self account
				await insertAccountConnectionIntention(
					ctx,
					otherAccountId,
					accountId,
					otherUserId,
				);

				const { id: userId, name: userName } = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ userId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: true,
					user: { name: userName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId, email: otherEmail } = await insertAccount(
					ctx,
					{ avatarUrl: null },
				);

				const { id: otherUserId } = await insertUser(ctx, otherAccountId);
				// Foreign account's intention to connect to self account
				await insertAccountConnectionIntention(
					ctx,
					otherAccountId,
					accountId,
					otherUserId,
				);

				const { id: userId, name: userName } = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ userId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					user: { name: userName },
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

				const { id: userId, name: userName } = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ userId, email: otherEmail }),
				);
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: otherAvatarUrl,
					},
					connected: false,
					user: { name: userName },
				});
			});

			test("avatar url does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { email: otherEmail, id: otherAccountId } = await insertAccount(
					ctx,
					{ avatarUrl: null },
				);

				const { id: userId, name: userName } = await insertUser(ctx, accountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ userId, email: otherEmail });
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: false,
					user: { name: userName },
				});
			});
		});

		test("multiple intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const { id: otherAccountId, email: otherEmail } = await insertAccount(
				ctx,
				{ avatarUrl: null },
			);

			const { id: otherUserId } = await insertUser(ctx, otherAccountId);
			// Foreign account's intention to connect to self account
			await insertAccountConnectionIntention(
				ctx,
				otherAccountId,
				accountId,
				otherUserId,
			);

			const { id: userId, name: userName } = await insertUser(ctx, accountId);

			const { email: anotherEmail, id: anotherAccountId } = await insertAccount(
				ctx,
				{ avatarUrl: null },
			);

			const { id: anotherUserId, name: anotherUserName } = await insertUser(
				ctx,
				accountId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await runInBand([
				() => caller.procedure({ userId, email: otherEmail }),
				() => caller.procedure({ userId: anotherUserId, email: anotherEmail }),
			]);
			expect(results).toStrictEqual<typeof results>([
				{
					account: {
						id: otherAccountId,
						email: otherEmail,
						avatarUrl: undefined,
					},
					connected: true,
					user: { name: userName },
				},
				{
					account: {
						id: anotherAccountId,
						email: anotherEmail,
						avatarUrl: undefined,
					},
					connected: false,
					user: { name: anotherUserName },
				},
			]);
		});
	});
});
