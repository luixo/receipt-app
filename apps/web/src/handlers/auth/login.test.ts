import { faker } from "@faker-js/faker";
import * as crypto from "node:crypto";
import { entries } from "remeda";
import { assert, describe, expect, vi } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from "~app/utils/validation";
import { createContext } from "~tests/backend/utils/context";
import {
	assertDatabase,
	insertAccountWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getNow, toDate } from "~utils/date";
import { t } from "~web/handlers/trpc";

const { TEST_BOT_TOKEN } = vi.hoisted(() => ({
	TEST_BOT_TOKEN: "test-bot-token",
}));

vi.mock(import("~web/utils/env"), async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		env: { ...original.env, TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN },
	};
});

const { procedure } = await import("./login");

const createCaller = t.createCallerFactory(t.router({ procedure }));

const buildInitData = (fields: Record<string, string>) => {
	const dataCheckString = entries(fields)
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	const secretKey = crypto
		.createHmac("sha256", "WebAppData")
		.update(TEST_BOT_TOKEN)
		.digest();
	const hash = crypto
		.createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");
	return new URLSearchParams({ ...fields, hash }).toString();
};

const validInitDataFields = () => ({
	auth_date: String(
		Math.floor(toDate.zonedDateTime(getNow.zonedDateTime()).getTime() / 1000),
	),
	user: JSON.stringify({ id: 123_456_789 }),
});

describe("auth.login", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(createContext(ctx));
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
				const caller = createCaller(createContext(ctx));
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
				const caller = createCaller(createContext(ctx));
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
			const caller = createCaller(createContext(ctx));
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
			const caller = createCaller(createContext(ctx));
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
			const context = createContext(ctx);
			const caller = createCaller(context);
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ email, password }),
			);
			expect(result).toStrictEqual<typeof result>({
				account: { id: accountId, verified: true, avatarUrl, role: undefined },
				user: { name },
			});
			const responseHeaders = [...context.resHeaders.entries()];
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			assert(
				setCookieTuple,
				"Header 'set-cookie' has to be set in the response",
			);
			const tokenMatch = /authToken=(?<token>[^;]+)/.exec(setCookieTuple[1]);
			assert(tokenMatch, "Cookie 'authToken' should be present");
			const [, token] = tokenMatch;
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
			const context = createContext(ctx);
			const caller = createCaller(context);
			const result = await caller.procedure({ email, password });
			expect(result).toStrictEqual<typeof result>({
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
			const context = createContext(ctx);
			const caller = createCaller(context);
			await caller.procedure({ email: email.toUpperCase(), password });
		});

		test("login successful - with Telegram init data", async ({ ctx }) => {
			const {
				accountId,
				account: { email, password },
			} = await insertAccountWithSession(ctx);
			const context = createContext(ctx);
			const caller = createCaller(context);
			const initData = buildInitData(validInitDataFields());
			await caller.procedure({ email, password, initData });
			const database = assertDatabase(ctx);
			const session = await database
				.selectFrom("sessions")
				.where("accountId", "=", accountId)
				.where("botUserId", "is not", null)
				.select("botUserId")
				.executeTakeFirstOrThrow();
			expect(session.botUserId).toBe("tg:123456789");
		});
	});
});
