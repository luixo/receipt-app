import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
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

import { procedure } from "./remove";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("userConnectionIntentions.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				targetUserId: faker.string.uuid(),
			}),
		);

		describe("targetUserId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetUserId: "not a valid uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "targetUserId": Invalid UUID`,
				);
			});
		});

		test("target intention is not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: outerUserId } = await insertUser(ctx);
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
			await expectTRPCError(
				() =>
					caller.procedure({
						targetUserId: foreignUserId,
					}),
				"NOT_FOUND",
				`Intention for  user id "${foreignUserId}" not found.`,
			);
		});
	});

	describe("functionality", () => {
		test("user connection intention is removed", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: outerUserId } = await insertUser(ctx);
			await insertPeer(ctx, userId, {
				connectedUserId: outerUserId,
			});
			await insertPeer(ctx, userId, {
				connectedUserId: foreignUserId,
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
				caller.procedure({ targetUserId: foreignUserId }),
			);
			expect(result).toStrictEqual<typeof result>(undefined);
		});
	});
});
