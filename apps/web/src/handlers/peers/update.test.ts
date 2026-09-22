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
	insertPeer,
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

describe("peers.update", () => {
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
				const caller = createCaller(createAuthContext(ctx, sessionId));
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

		describe.each(["name", "publicName"] as const)("%s", (field) => {
			test("minimal length", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: peerId } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: peerId,
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
					`Zod error\n\nAt "update.${field}": Minimal length for peer name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: peerId } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: peerId,
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
					`Zod error\n\nAt "update.${field}": Maximum length for peer name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});

		test("changing your own name via 'peers.update' method", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
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

		test("changing your own publicName via 'peers.update' method", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
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
				`Updating self peer property expect but "name" is not allowed.`,
			);
		});

		test("peer not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other peers doesn't affect the error
			await insertPeer(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentPeerId,
						update: {
							type: "name",
							name: "a".repeat(MIN_USERNAME_LENGTH),
						},
					}),
				"NOT_FOUND",
				`No peer found by id "${nonExistentPeerId}".`,
			);
		});

		test("peer is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignPeerId,
						update: { type: "name", name: "a".repeat(MIN_USERNAME_LENGTH) },
					}),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("name is changed", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: peerId,
					update: { type: "name", name: faker.person.fullName() },
				}),
			);
		});

		test("public name is changed", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);
			// Verify other peers are not affected
			await insertPeer(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: peerId,
					update: { type: "publicName", publicName: faker.person.fullName() },
				}),
			);
		});

		test("public name is changed to undefined", async ({ ctx }) => {
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, otherAccountId);
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId, {
				publicName: "foo",
			});
			// Verify other peers are not affected
			await insertPeer(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					id: peerId,
					update: { type: "publicName", publicName: undefined },
				}),
			);
		});
	});
});
