import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from "~app/utils/validation";
import { createContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { getResHeaders } from "~web/utils/headers";

import { procedure } from "./login";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.login", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "invalid@@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		describe("password", () => {
			test("minimal length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		test("account not found", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const email = faker.internet.email();
			await expectTRPCError(
				() =>
					caller.procedure({
						email,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"UNAUTHORIZED",
				`Authentication of account "${email}" failed: account not found.`,
			);
		});

		test("authentication failed", async ({ ctx }) => {
			const {
				account: { email, password },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(await createContext(ctx));
			await expectTRPCError(
				() =>
					caller.procedure({
						email,
						password: `${password}_fail`,
					}),
				"UNAUTHORIZED",
				`Authentication of account "${email}" failed: password is wrong.`,
			);
		});
	});

	describe("functionality", () => {
		test("login successful", async ({ ctx }) => {
			const {
				accountId,
				account: { email, password, avatarUrl },
				name,
			} = await insertAccountWithSession(ctx);
			const context = await createContext(ctx);
			const caller = createCaller(context);
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ email, password }),
			);
			expect(result).toEqual<typeof result>({
				account: { id: accountId, verified: true, avatarUrl, role: undefined },
				user: { name },
			});
			const responseHeaders = getResHeaders(context.res);
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			assert(
				setCookieTuple,
				"Header 'set-cookie' has to be set in the response",
			);
			const tokenMatch = /authToken=([^;]+)/.exec(setCookieTuple[1].toString());
			assert(tokenMatch, "Cookie 'authToken' should be present");
			const token = tokenMatch[1];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${token}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});

		test("login successful - unverified user", async ({ ctx }) => {
			const {
				accountId,
				account: { email, password },
				name,
			} = await insertAccountWithSession(ctx, {
				account: { confirmation: {}, avatarUrl: null },
			});
			const context = await createContext(ctx);
			const caller = createCaller(context);
			const result = await caller.procedure({ email, password });
			expect(result).toEqual<typeof result>({
				account: {
					id: accountId,
					verified: false,
					avatarUrl: undefined,
					role: undefined,
				},
				user: { name },
			});
		});

		test("login successful - with different casing", async ({ ctx }) => {
			const {
				account: { email, password },
			} = await insertAccountWithSession(ctx);
			const context = await createContext(ctx);
			const caller = createCaller(context);
			await caller.procedure({ email: email.toUpperCase(), password });
		});
	});
});
