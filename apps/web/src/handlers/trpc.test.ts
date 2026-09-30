import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";
import z from "zod";

import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { createAuthContext, createContext } from "~tests/backend/utils/context";
import { insertUser, insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { SESSION_REFRESH_DURATION } from "~web/handlers/auth/utils";
import { defineHandlerVersions } from "~web/handlers/context";
import { t, unauthProcedure } from "~web/handlers/trpc";

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

	describe("version migration", () => {
		const inputSchema = z.object({ baz: z.number() });

		// foo -> bar -> baz
		const versions = defineHandlerVersions(inputSchema)([
			[1, z.object({ foo: z.number() }).transform(({ foo }) => ({ bar: foo }))],
			[2, z.object({ bar: z.number() }).transform(({ bar }) => ({ baz: bar }))],
		]);

		const createMigrationCaller = t.createCallerFactory(
			t.router({
				migration: unauthProcedure
					.meta({ title: "", description: "", versions })
					.input(inputSchema)
					.query(({ input: { baz } }) => ({ message: baz })),
			}),
		);

		const overrideInputType = (input: unknown) =>
			input as z.infer<typeof inputSchema>;

		describe("valid input", () => {
			test("oldest input is migrated", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "0" } }),
				);
				const result = await caller.migration(
					overrideInputType({ foo: value }),
				);
				expect(result).toStrictEqual<typeof result>({ message: value });
			});

			test("middle version input is migrated", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "1" } }),
				);
				const result = await caller.migration(
					overrideInputType({ bar: value }),
				);
				expect(result).toStrictEqual<typeof result>({ message: value });
			});

			test("latest version input is valid", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "2" } }),
				);
				const result = await caller.migration({ baz: value });
				expect(result).toStrictEqual<typeof result>({ message: value });
			});

			test("newer-than-latest version input is valid", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "3" } }),
				);
				const result = await caller.migration({ baz: value });
				expect(result).toStrictEqual<typeof result>({ message: value });
			});
		});

		describe("invalid input", () => {
			test("invalid old input is rejected", async ({ ctx }) => {
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "0" } }),
				);
				await expectTRPCError(
					() => caller.migration(overrideInputType({ foo: "invalid number" })),
					"BAD_REQUEST",
					"Unable to migrate input to version 1",
				);
			});

			test("invalid latest input is rejected", async ({ ctx }) => {
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "2" } }),
				);
				await expectTRPCError(
					() => caller.migration(overrideInputType({ baz: "invalid number" })),
					"BAD_REQUEST",
					'Zod error\n\nAt "baz": Invalid input: expected number, received string',
				);
			});
		});

		describe("app version cases", () => {
			test("no app version provided", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(createContext(ctx));
				const result = await caller.migration({ baz: value });
				expect(result).toStrictEqual<typeof result>({ message: value });
				await expectTRPCError(
					() => caller.migration(overrideInputType({ baz: "invalid number" })),
					"BAD_REQUEST",
					'Zod error\n\nAt "baz": Invalid input: expected number, received string',
				);
			});

			test("invalid app version", async ({ ctx }) => {
				const value = faker.number.int();
				const caller = createMigrationCaller(
					createContext(ctx, { reqHeaders: { "x-app-version": "NaN" } }),
				);
				const result = await caller.migration({ baz: value });
				expect(result).toStrictEqual<typeof result>({ message: value });
				await expectTRPCError(
					() => caller.migration(overrideInputType({ baz: "invalid number" })),
					"BAD_REQUEST",
					'Zod error\n\nAt "baz": Invalid input: expected number, received string',
				);
			});
		});
	});
});
