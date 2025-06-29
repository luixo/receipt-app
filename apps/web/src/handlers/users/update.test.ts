import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import {
	MAX_USERNAME_LENGTH,
	MIN_USERNAME_LENGTH,
} from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
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

import { procedure } from "./update";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { type: "name", name: faker.person.fullName() },
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
							update: { type: "name", name: "a".repeat(MIN_USERNAME_LENGTH) },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		(["name", "publicName"] as const).forEach((field) => {
			describe(field, () => {
				test("minimal length", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: userId } = await insertUser(ctx, accountId);
					const caller = createCaller(await createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								id: userId,
								update:
									field === "name"
										? {
												type: field,
												[field]: "a".repeat(MIN_USERNAME_LENGTH - 1),
											}
										: {
												type: field,
												[field]: "a".repeat(MIN_USERNAME_LENGTH - 1),
											},
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "update.${field}": Minimal length for user name is ${MIN_USERNAME_LENGTH}`,
					);
				});

				test("maximum length", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: userId } = await insertUser(ctx, accountId);
					const caller = createCaller(await createAuthContext(ctx, sessionId));
					await expectTRPCError(
						() =>
							caller.procedure({
								id: userId,
								update:
									field === "name"
										? {
												type: field,
												[field]: "a".repeat(MAX_USERNAME_LENGTH + 1),
											}
										: {
												type: field,
												[field]: "a".repeat(MAX_USERNAME_LENGTH + 1),
											},
							}),
						"BAD_REQUEST",
						`Zod error\n\nAt "update.${field}": Maximum length for user name is ${MAX_USERNAME_LENGTH}`,
					);
				});
			});
		});

		test("changing your own name via 'users.update' method", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: accountId,
						update: { type: "name", name: "a".repeat(MIN_USERNAME_LENGTH) },
					}),
				"BAD_REQUEST",
				`Please use "account.changeName" handler to update your own name.`,
			);
		});

		test("changing your own publicName via 'users.update' method", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: accountId,
						update: {
							type: "publicName",
							publicName: "a".repeat(MIN_USERNAME_LENGTH),
						},
					}),
				"BAD_REQUEST",
				`Updating self user property expect but "name" is not allowed.`,
			);
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentUserId,
						update: {
							type: "name",
							name: "a".repeat(MIN_USERNAME_LENGTH),
						},
					}),
				"NOT_FOUND",
				`No user found by id "${nonExistentUserId}".`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
						update: { type: "name", name: "a".repeat(MIN_USERNAME_LENGTH) },
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("name is changed", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertUser(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: userId,
					update: { type: "name", name: faker.person.fullName() },
				}),
			);
		});

		test("public name is changed", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertUser(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			// Verify other users are not affected
			await insertUser(ctx, accountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: userId,
					update: { type: "publicName", publicName: faker.person.fullName() },
				}),
			);
		});

		test("public name is changed to undefined", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertUser(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId, {
				publicName: "foo",
			});
			// Verify other users are not affected
			await insertUser(ctx, accountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: userId,
					update: { type: "publicName", publicName: undefined },
				}),
			);
		});
	});
});
