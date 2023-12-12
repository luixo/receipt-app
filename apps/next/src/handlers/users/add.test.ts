import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";
import { z } from "zod";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountConnectionIntention,
	insertAccountWithSession,
	insertConnectedUsers,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from "app/utils/validation";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./add";

const router = t.router({ procedure });

describe("users.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ name: faker.person.fullName() }),
		);

		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

		(["name", "publicName"] as const).forEach((field) => {
			describe(field, () => {
				test("minimal length", async ({ ctx }) => {
					const { sessionId } = await insertAccountWithSession(ctx);
					const caller = router.createCaller(createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								name: faker.person.fullName(),
								[field]: "a".repeat(MIN_USERNAME_LENGTH - 1),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${field}": Minimal length for user name is ${MIN_USERNAME_LENGTH}`,
					);
				});

				test("maximum length", async ({ ctx }) => {
					const { sessionId } = await insertAccountWithSession(ctx);
					const caller = router.createCaller(createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								name: faker.person.fullName(),
								[field]: "a".repeat(MAX_USERNAME_LENGTH + 1),
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "${field}": Maximum length for user name is ${MAX_USERNAME_LENGTH}`,
					);
				});
			});
		});

		test("target email is not registered", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const fakeEmail = "non-existent@mail.org";
			await expectTRPCError(
				() =>
					caller.procedure({
						name: faker.person.fullName(),
						email: fakeEmail,
					}),
				"NOT_FOUND",
				`Account with email "${fakeEmail}" does not exist.`,
			);
		});

		describe("email connection intention exceptions", () => {
			test("target email is already connected as another user", async ({
				ctx,
			}) => {
				// Foreign account
				const { id: otherAccountId, email: otherEmail } = await insertAccount(
					ctx,
				);
				// Self account
				const { accountId, sessionId } = await insertAccountWithSession(ctx);
				const [{ name: userName }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							email: otherEmail,
						}),
					"CONFLICT",
					`Account with email "${otherEmail}" is already connected to user "${userName}".`,
				);
			});

			test("account intention already exists", async ({ ctx }) => {
				// Foreign account
				const { id: otherAccountId, email: otherEmail } = await insertAccount(
					ctx,
				);
				// Self account
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: userId, name: userName } = await insertUser(ctx, accountId);
				// Self account's intention to connect to foreign account
				await insertAccountConnectionIntention(
					ctx,
					accountId,
					otherAccountId,
					userId,
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							name: faker.person.fullName(),
							email: otherEmail,
						}),
					"CONFLICT",
					`You already has intention to connect to "${otherEmail}" as user "${userName}".`,
				);
			});

			test.skip("user intention already exists", async () => {
				// This will only happen on adding an intention on already existing user
			});
		});
	});

	describe("functionality", () => {
		test("user is added - no public name, no email", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccount(ctx);

			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ name: faker.person.fullName() }),
			);
		});

		test("user is added - public name, no email", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccount(ctx);

			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					name: faker.person.fullName(),
					publicName: faker.person.fullName(),
				}),
			);
		});

		describe("user is added - with email", () => {
			test("has a vice versa intention", async ({ ctx }) => {
				// Foreign account
				const { id: otherAccountId, email: otherEmail } = await insertAccount(
					ctx,
				);
				const { id: otherUserId } = await insertUser(ctx, otherAccountId);
				// Self account
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				// Foreign account's intention to connect to self account
				await insertAccountConnectionIntention(
					ctx,
					otherAccountId,
					accountId,
					otherUserId,
				);

				const asName = faker.person.fullName();
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						name: asName,
						email: otherEmail,
					}),
				);
				const uuidSchema = z.string().uuid();
				await expect(uuidSchema.safeParse(result.id).success).toBe(true);
				await expect(result).toStrictEqual<typeof result>({
					connection: {
						connected: true,
						account: {
							id: otherAccountId,
							email: otherEmail,
						},
						user: { name: asName },
					},
					id: result.id,
				});
			});

			test("doesn't have a vice versa intention", async ({ ctx }) => {
				// Foreign account
				const { email: otherEmail, id: otherAccountId } = await insertAccount(
					ctx,
				);
				// Self account
				const { sessionId } = await insertAccountWithSession(ctx);

				const asName = faker.person.fullName();
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						name: asName,
						email: otherEmail,
					}),
				);
				const uuidSchema = z.string().uuid();
				await expect(uuidSchema.safeParse(result.id).success).toBe(true);
				await expect(result).toStrictEqual<typeof result>({
					connection: {
						connected: false,
						account: {
							id: otherAccountId,
							email: otherEmail,
						},
						user: { name: asName },
					},
					id: result.id,
				});
			});
		});
	});
});
