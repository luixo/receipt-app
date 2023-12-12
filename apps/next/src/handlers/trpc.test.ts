import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";
import { z } from "zod";
import * as zfd from "zod-form-data";

import { createAuthContext, createContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import {
	SESSION_EXPIRATION_DURATION,
	SESSION_SHOULD_UPDATE_EVERY,
} from "next-app/handlers/auth/utils";
import { multipartMiddlware, t } from "next-app/handlers/trpc";

import { getClientServer } from "./utils.test";

import { router } from "./index";

describe("procedures", () => {
	describe("unauth procedure", () => {
		test("success logged data", async ({ ctx }) => {
			ctx.logger.level = "trace";

			const caller = router.createCaller(createContext(ctx));
			await caller.sessions.cleanup();
			const loggedMessages = ctx.logger.getMessages();
			expect(Array.isArray(loggedMessages)).toBe(true);
			const loggedProcedureMessage = loggedMessages[
				loggedMessages.length - 1
			] as [
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
			ctx.logger.level = "trace";

			const caller = router.createCaller(createContext(ctx));
			await caller.account.get().catch((e) => e);
			const loggedMessages = ctx.logger.getMessages();
			expect(Array.isArray(loggedMessages)).toBe(true);
			const loggedProcedureMessage = loggedMessages[
				loggedMessages.length - 1
			] as [
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
					path: "account.get",
					type: "query",
				},
				"Non-OK request timing:",
			]);
		});
	});

	describe("auth procedure", () => {
		test("no token provided", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			await expectTRPCError(
				() => caller.account.get(),
				"UNAUTHORIZED",
				"No token provided",
			);
		});

		test("invalid uuid", async ({ ctx }) => {
			const caller = router.createCaller(
				createContext(ctx, {
					headers: { cookie: "authToken=fake" },
				}),
			);
			await expectTRPCError(
				() => caller.account.get(),
				"UNAUTHORIZED",
				"Session id mismatch",
			);
		});

		test("non-existent session", async ({ ctx }) => {
			// Verify that other accounts don't affect the result
			await insertAccountWithSession(ctx);

			const caller = router.createCaller(
				createContext(ctx, {
					headers: { cookie: `authToken=${faker.string.uuid()}` },
				}),
			);
			await expectTRPCError(
				() => caller.account.get(),
				"UNAUTHORIZED",
				"Session id mismatch",
			);
		});

		test("session is not auto-updated", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx, {
				session: {
					expirationTimestamp: new Date(
						Date.now() +
							(SESSION_EXPIRATION_DURATION - SESSION_SHOULD_UPDATE_EVERY) +
							1000,
					),
				},
			});

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () => caller.account.get());
			const responseHeaders = ctx.responseHeaders.get();
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([]);
		});

		test("session is auto-updated", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx, {
				session: {
					expirationTimestamp: new Date(
						Date.now() +
							(SESSION_EXPIRATION_DURATION - SESSION_SHOULD_UPDATE_EVERY) -
							1000,
					),
				},
			});

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () => caller.account.get());
			const responseHeaders = ctx.responseHeaders.get();
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${sessionId}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});
	});

	describe("multipart middleware", () => {
		test("is in valid", async ({ ctx }) => {
			const { start, destroy, client } = await getClientServer(
				ctx,
				t.router({
					procedure: t.procedure
						.use(multipartMiddlware)
						.input(z.strictObject({ foo: z.string() }))
						.mutation(({ input }) => input.foo),
				}),
			);
			const validationText = faker.lorem.text();
			await start();
			const result = await client.procedure.mutate({ foo: validationText });
			expect(result).toEqual(validationText);
			await destroy();
		});

		test("is valid", async ({ ctx }) => {
			const { start, destroy, client } = await getClientServer(
				ctx,
				t.router({
					procedure: t.procedure
						.use(multipartMiddlware)
						.input(zfd.formData({ foo: zfd.text() }))
						.mutation(({ input }) => input.foo),
				}),
			);
			const validationText = faker.lorem.text();
			await start();
			const formData = new FormData();
			formData.append("foo", validationText);
			const result = await client.procedure.mutate(formData);
			expect(result).toEqual(validationText);
			await destroy();
		});
	});
});
