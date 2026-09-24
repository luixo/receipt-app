import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { createAuthContext, createContext } from "~tests/backend/utils/context";
import { insertUser, insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { SESSION_REFRESH_DURATION } from "~web/handlers/auth/utils";
import { t } from "~web/handlers/trpc";

import { router } from "./index";

const createCaller = t.createCallerFactory(router);

describe("procedures", () => {
	describe("unauth procedure", () => {
		test("success logged data", async ({ ctx }) => {
			// oxlint-disable-next-line no-param-reassign
			ctx.logger.level = "trace";

			const caller = createCaller(createContext(ctx));
			await caller.sessions.cleanup();
			const loggedMessages = ctx.logger.getMessages();
			expect(Array.isArray(loggedMessages)).toBe(true);
			const loggedProcedureMessage = loggedMessages.at(-1) as [
				{
					durationMs: number;
					path: string;
					type: string;
				},
				string,
			];
			expect(loggedProcedureMessage[0].durationMs).toBeTypeOf("number");
			expect(loggedProcedureMessage).toStrictEqual<
				typeof loggedProcedureMessage
			>([
				{
					durationMs: loggedProcedureMessage[0].durationMs,
					path: "sessions.cleanup",
					type: "mutation",
				},
				"OK request timing:",
			]);
		});
		test("failed logged data", async ({ ctx }) => {
			// oxlint-disable-next-line no-param-reassign
			ctx.logger.level = "trace";

			const caller = createCaller(createContext(ctx));
			await caller.user.get().catch((error) => error);
			const loggedMessages = ctx.logger.getMessages();
			expect(Array.isArray(loggedMessages)).toBe(true);
			const loggedProcedureMessage = loggedMessages.at(-1) as [
				{
					durationMs: number;
					path: string;
					type: string;
				},
				string,
			];
			expect(loggedProcedureMessage[0].durationMs).toBeTypeOf("number");
			expect(loggedProcedureMessage).toStrictEqual<
				typeof loggedProcedureMessage
			>([
				{
					durationMs: loggedProcedureMessage[0].durationMs,
					path: "user.get",
					type: "query",
				},
				"Non-OK request timing:",
			]);
		});
	});

	describe("auth procedure", () => {
		test("no token provided", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			await expectTRPCError(
				() => caller.user.get(),
				"UNAUTHORIZED",
				"No token provided",
			);
		});

		test("invalid uuid", async ({ ctx }) => {
			const caller = createCaller(
				createContext(ctx, {
					reqHeaders: { cookie: "authToken=fake" },
				}),
			);
			await expectTRPCError(
				() => caller.user.get(),
				"UNAUTHORIZED",
				"Session id mismatch",
			);
		});

		test("non-existent session", async ({ ctx }) => {
			// Verify that other users don't affect the result
			await insertUserWithSession(ctx);

			const caller = createCaller(
				createContext(ctx, {
					reqHeaders: { cookie: `authToken=${faker.string.uuid()}` },
				}),
			);
			await expectTRPCError(
				() => caller.user.get(),
				"UNAUTHORIZED",
				"Session id mismatch",
			);
		});

		test("session is not auto-updated", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx, {
				session: {
					expirationTimestamp: Temporal.Now.zonedDateTimeISO()
						.add(SESSION_REFRESH_DURATION)
						.add({ seconds: 1 }),
				},
			});

			const context = createAuthContext(ctx, sessionId);
			const caller = createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.user.get());
			const responseHeaders = [...context.resHeaders.entries()];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([]);
		});

		test("session is auto-updated", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx, {
				session: {
					expirationTimestamp: Temporal.Now.zonedDateTimeISO()
						.add(SESSION_REFRESH_DURATION)
						.subtract({ seconds: 1 }),
				},
			});

			const context = createAuthContext(ctx, sessionId);
			const caller = createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.user.get());
			const responseHeaders = [...context.resHeaders.entries()];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${sessionId}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});

		describe("pretend peer", () => {
			describe("context is regular", () => {
				test("with non-admin role", async ({ ctx }) => {
					const { sessionId, userId } = await insertUserWithSession(ctx);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const { user } = await caller.user.get();
					expect(user.id).toStrictEqual(userId);
				});

				test("with email not found", async ({ ctx }) => {
					const { sessionId, userId } = await insertUserWithSession(ctx, {
						user: { role: "admin" },
					});
					const caller = createCaller(
						createAuthContext(ctx, sessionId, {
							reqHeaders: {
								cookie: `${PRETEND_USER_STORE_NAME}=${JSON.stringify({
									email: "not@found.com",
								})}`,
							},
						}),
					);
					const { user } = await caller.user.get();
					expect(user.id).toStrictEqual(userId);
				});

				test("with magic header", async ({ ctx }) => {
					const { sessionId, userId } = await insertUserWithSession(ctx, {
						user: { role: "admin" },
					});
					const foreignUser = await insertUser(ctx);
					const caller = createCaller(
						createAuthContext(ctx, sessionId, {
							reqHeaders: {
								cookie: `${PRETEND_USER_STORE_NAME}=${JSON.stringify({
									email: foreignUser.email,
								})}`,
								"x-keep-real-auth": "true",
							},
						}),
					);
					const { user } = await caller.user.get();
					expect(user.id).toStrictEqual(userId);
				});

				test("with malformed cookie", async ({ ctx }) => {
					const { sessionId, userId } = await insertUserWithSession(ctx, {
						user: { role: "admin" },
					});
					const foreignUser = await insertUser(ctx);
					const caller = createCaller(
						createAuthContext(ctx, sessionId, {
							reqHeaders: {
								cookie: `${PRETEND_USER_STORE_NAME}=${JSON.stringify({
									email2: foreignUser.email,
								})}`,
							},
						}),
					);
					const { user } = await caller.user.get();
					expect(user.id).toStrictEqual(userId);
				});
			});

			test("context is swapped", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx, {
					user: { role: "admin" },
				});
				const foreignUser = await insertUser(ctx);
				const caller = createCaller(
					createAuthContext(ctx, sessionId, {
						reqHeaders: {
							cookie: `${PRETEND_USER_STORE_NAME}=${JSON.stringify({
								email: foreignUser.email,
							})}`,
						},
					}),
				);
				const { user } = await caller.user.get();
				expect(user.id).toStrictEqual(foreignUser.id);
			});
		});
	});

	describe("admin procedure", () => {
		test("peer is not admin", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx, {
				user: { role: "foo" },
			});
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.admin.users(),
				"UNAUTHORIZED",
				"Admin procedure is available only if you're an admin",
			);
		});

		test("peer is admin", async ({ ctx }) => {
			const { sessionId } = await insertUserWithSession(ctx, {
				user: { role: "admin" },
			});
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const users = await caller.admin.users();
			expect(users.items).toHaveLength(0);
		});
	});
});
