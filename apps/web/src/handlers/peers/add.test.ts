import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import {
	MAX_USERNAME_LENGTH,
	MIN_USERNAME_LENGTH,
	peerIdSchema,
} from "~app/utils/validation";
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

describe("peers.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ name: faker.person.fullName() }),
		);

		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							email: "invalid@@mail.org",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		describe.each(["name", "publicName"] as const)("%s", (field) => {
			test("minimal length", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							[field]: "a".repeat(MIN_USERNAME_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "${field}": Minimal length for peer name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							[field]: "a".repeat(MAX_USERNAME_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "${field}": Maximum length for peer name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});

		test("target email is not registered", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeEmail = "non-existent@mail.org";
			await expectTRPCError(
				() =>
					caller.procedure({
						name: faker.person.fullName(),
						email: fakeEmail,
					}),
				"NOT_FOUND",
				`User with email "${fakeEmail}" does not exist.`,
			);
		});

		describe("email connection intention exceptions", () => {
			test("target email is already connected as another peer", async ({
				ctx,
			}) => {
				// Foreign  user
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx);
				// Self  user
				const { userId, sessionId } = await insertUserWithSession(ctx);
				const [{ name: peerName }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							email: otherEmail,
						}),
					"CONFLICT",
					`User with email "${otherEmail}" is already connected to peer "${peerName}".`,
				);
			});

			test("user intention already exists", async ({ ctx }) => {
				// Foreign  user
				const { id: otherUserId, email: otherEmail } = await insertUser(ctx);
				// Self  user
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { name: peerName } = await insertPeer(ctx, userId, {
					connectedUserId: otherUserId,
				});

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							email: otherEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to "${otherEmail}" as peer "${peerName}".`,
				);
			});
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure({ name: faker.person.fullName() }),
					() =>
						caller
							.procedure({
								name: faker.person.fullName(),
								email: "invalid@@mail.org",
							})
							.catch((error) => error),
				]),
			);

			expect(peerIdSchema.safeParse(results[0].id).success).toBe(true);
			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				id: results[0].id,
				connection: undefined,
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
		});
	});

	describe("functionality", () => {
		test("peer is added - no public name, no email", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertUser(ctx);

			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ name: faker.person.fullName() }),
			);
			expect(peerIdSchema.safeParse(result.id).success).toBe(true);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				connection: undefined,
			});
		});

		test("peer is added - public name, no email", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertUser(ctx);

			const { sessionId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					name: faker.person.fullName(),
					publicName: faker.person.fullName(),
				}),
			);
			expect(peerIdSchema.safeParse(result.id).success).toBe(true);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				connection: undefined,
			});
		});

		describe("peer is added - with email", () => {
			test("has a vice versa intention", async ({ ctx }) => {
				// Foreign  user
				const {
					id: otherUserId,
					email: otherEmail,
					avatarUrl: otherAvatarUrl,
				} = await insertUser(ctx);
				// Self  user
				const { sessionId, userId } = await insertUserWithSession(ctx);
				// Foreign  user's intention to connect to self  user
				await insertPeer(ctx, otherUserId, {
					connectedUserId: userId,
				});

				const asName = faker.person.fullName();
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						name: asName,
						email: otherEmail,
					}),
				);
				expect(peerIdSchema.safeParse(result.id).success).toBe(true);
				expect(result).toStrictEqual<typeof result>({
					connection: {
						connected: true,
						user: {
							id: otherUserId,
							email: otherEmail,
							avatarUrl: otherAvatarUrl,
						},
						peer: { name: asName },
					},
					id: result.id,
				});
			});

			test("doesn't have a vice versa intention", async ({ ctx }) => {
				// Foreign  user
				const { email: otherEmail, id: otherUserId } = await insertUser(ctx, {
					avatarUrl: null,
				});
				// Self  user
				const { sessionId } = await insertUserWithSession(ctx);

				const asName = faker.person.fullName();
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						name: asName,
						email: otherEmail,
					}),
				);
				expect(peerIdSchema.safeParse(result.id).success).toBe(true);
				expect(result).toStrictEqual<typeof result>({
					connection: {
						connected: false,
						user: {
							id: otherUserId,
							email: otherEmail,
							avatarUrl: undefined,
						},
						peer: { name: asName },
					},
					id: result.id,
				});
			});
		});

		test("multiple peers added", async ({ ctx }) => {
			// Self  user
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Direct intention foreign  user
			const { email: anotherEmail, id: anotherUserId } = await insertUser(ctx, {
				avatarUrl: null,
			});

			// Vice versa intention foreign  user
			const { id: otherUserId, email: otherEmail } = await insertUser(ctx, {
				avatarUrl: null,
			});
			// Foreign  user's intention to connect to self  user
			await insertPeer(ctx, otherUserId, {
				connectedUserId: userId,
			});

			const asName = faker.person.fullName();
			const anotherAsName = faker.person.fullName();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await runInBand([
				() => caller.procedure({ name: faker.person.fullName() }),
				() => caller.procedure({ name: asName, email: otherEmail }),
				() => caller.procedure({ name: anotherAsName, email: anotherEmail }),
			]);
			for (const result of results) {
				expect(peerIdSchema.safeParse(result.id).success).toBe(true);
			}
			expect(results).toStrictEqual<typeof results>([
				{ id: results[0].id, connection: undefined },
				{
					connection: {
						connected: true,
						user: {
							id: otherUserId,
							email: otherEmail,
							avatarUrl: undefined,
						},
						peer: { name: asName },
					},
					id: results[1].id,
				},
				{
					connection: {
						connected: false,
						user: {
							id: anotherUserId,
							email: anotherEmail,
							avatarUrl: undefined,
						},
						peer: { name: anotherAsName },
					},
					id: results[2].id,
				},
			]);
		});
	});
});
