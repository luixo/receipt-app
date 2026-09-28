// Auth compatibility tests intentionally use server-side crypto and native time.
// oxlint-disable eslint-js/no-restricted-syntax
import { faker } from "@faker-js/faker";
import { createEmailVerificationToken } from "better-auth/api";
import { createHmac } from "node:crypto";
import { describe, expect } from "vitest";

import { TEST_AUTH_SECRET, createContext } from "~tests/backend/utils/context";
import { assertAuthDatabase, insertAccount } from "~tests/backend/utils/data";
import { test } from "~tests/backend/utils/test";
import { getHash } from "~utils/server/crypto";

import {
	forwardAuthCookies,
	getAuthProfiles,
	getAuthProfilesByEmail,
	getAuthResponseError,
	getRequestAuth,
	verifyEmailToken,
} from "./auth";

describe("auth module", () => {
	describe("legacy password migration", () => {
		test("first login rewrites the password", async ({ ctx }) => {
			const password = faker.internet.password();
			const salt = faker.string.alphanumeric(64);
			const { email, id } = await insertAccount(ctx, {
				password,
				legacy: { salt, hash: await getHash(password, salt) },
			});
			const auth = getRequestAuth(createContext(ctx));
			const response = await auth.api.signInEmail({
				body: { email, password },
				asResponse: true,
			});
			expect(response.status).toBe(200);
			const account = await assertAuthDatabase(ctx)
				.selectFrom("auth.account")
				.select(["password", "legacyPasswordSalt", "legacyPasswordHash"])
				.where("userId", "=", id)
				.executeTakeFirstOrThrow();
			expect(account.password).toStrictEqual(expect.any(String));
			expect(account.legacyPasswordSalt).toBeNull();
			expect(account.legacyPasswordHash).toBeNull();
			// Second login goes through the regular scrypt path
			const secondResponse = await auth.api.signInEmail({
				body: { email, password },
				asResponse: true,
			});
			expect(secondResponse.status).toBe(200);
		});

		test("wrong password keeps the legacy hash", async ({ ctx }) => {
			const password = faker.internet.password();
			const salt = faker.string.alphanumeric(64);
			const hash = await getHash(password, salt);
			const { email, id } = await insertAccount(ctx, {
				password,
				legacy: { salt, hash },
			});
			const auth = getRequestAuth(createContext(ctx));
			const response = await auth.api.signInEmail({
				body: { email, password: `${password}-wrong` },
				asResponse: true,
			});
			expect(response.ok).toBe(false);
			await expect(getAuthResponseError(response)).resolves.toBe(
				"INVALID_EMAIL_OR_PASSWORD",
			);
			const account = await assertAuthDatabase(ctx)
				.selectFrom("auth.account")
				.select(["password", "legacyPasswordSalt", "legacyPasswordHash"])
				.where("userId", "=", id)
				.executeTakeFirstOrThrow();
			expect(account.password).toBeNull();
			expect(account.legacyPasswordSalt).toBe(salt);
			expect(account.legacyPasswordHash).toBe(hash);
		});
	});

	describe("email callbacks", () => {
		test("signup sends verification email when active", async ({ ctx }) => {
			const auth = getRequestAuth(createContext(ctx));
			const email = faker.internet.email().toLowerCase();
			await auth.api.signUpEmail({
				body: {
					email,
					password: faker.internet.password(),
					name: faker.person.firstName(),
				},
			});
			const messages = ctx.emailOptions.mock.getMessages();
			expect(messages).toHaveLength(1);
			const sentAt = await assertAuthDatabase(ctx)
				.selectFrom("auth.user")
				.select(["verificationEmailSentAt"])
				.where("email", "=", email)
				.executeTakeFirstOrThrow();
			expect(sentAt.verificationEmailSentAt).not.toBeNull();
		});

		test("signup sends nothing when inactive", async ({ ctx }) => {
			ctx.emailOptions.setActive(false);
			const auth = getRequestAuth(createContext(ctx));
			await auth.api.signUpEmail({
				body: {
					email: faker.internet.email().toLowerCase(),
					password: faker.internet.password(),
					name: faker.person.firstName(),
				},
			});
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});

		test("reset sends email when active", async ({ ctx }) => {
			const { email } = await insertAccount(ctx);
			const auth = getRequestAuth(createContext(ctx));
			await auth.api.requestPasswordReset({ body: { email } });
			const messages = ctx.emailOptions.mock.getMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0]?.address).toBe(email);
		});

		test("reset sends nothing when inactive", async ({ ctx }) => {
			const { email } = await insertAccount(ctx);
			ctx.emailOptions.setActive(false);
			const auth = getRequestAuth(createContext(ctx));
			await auth.api.requestPasswordReset({ body: { email } });
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});
	});

	describe("password reset clears legacy hash", () => {
		test("legacy columns are cleared", async ({ ctx }) => {
			const password = faker.internet.password();
			const salt = faker.string.alphanumeric(64);
			const { email, id } = await insertAccount(ctx, {
				password,
				legacy: { salt, hash: await getHash(password, salt) },
			});
			const auth = getRequestAuth(createContext(ctx));
			await auth.api.requestPasswordReset({ body: { email } });
			const { identifier } = await assertAuthDatabase(ctx)
				.selectFrom("auth.verification")
				.select(["identifier"])
				.where("identifier", "like", "reset-password:%")
				.executeTakeFirstOrThrow();
			const intentionToken = identifier.replace("reset-password:", "");
			const newPassword = faker.internet.password();
			await auth.api.resetPassword({
				body: { newPassword, token: intentionToken },
			});
			const account = await assertAuthDatabase(ctx)
				.selectFrom("auth.account")
				.select(["password", "legacyPasswordSalt", "legacyPasswordHash"])
				.where("userId", "=", id)
				.executeTakeFirstOrThrow();
			expect(account.password).toStrictEqual(expect.any(String));
			expect(account.legacyPasswordSalt).toBeNull();
			expect(account.legacyPasswordHash).toBeNull();
		});
	});

	describe("email token verification", () => {
		test("round-trips a real token", async () => {
			const email = faker.internet.email().toLowerCase();
			const token = await createEmailVerificationToken(
				TEST_AUTH_SECRET,
				email,
				undefined,
				3600,
			);
			expect(verifyEmailToken(TEST_AUTH_SECRET, token)).toBe(email);
		});

		test("rejects malformed tokens", () => {
			expect(() => verifyEmailToken(TEST_AUTH_SECRET, "no-dots")).toThrow(
				"Invalid email token format",
			);
			expect(() => verifyEmailToken(TEST_AUTH_SECRET, "a.b.c.d")).toThrow(
				"Invalid email token signature",
			);
		});

		test("rejects wrong signature", async () => {
			const token = await createEmailVerificationToken(
				TEST_AUTH_SECRET,
				faker.internet.email().toLowerCase(),
				undefined,
				3600,
			);
			expect(() => verifyEmailToken("wrong-secret", token)).toThrow(
				"Invalid email token signature",
			);
		});

		test("rejects expired tokens", async () => {
			const email = faker.internet.email().toLowerCase();
			const token = await createEmailVerificationToken(
				TEST_AUTH_SECRET,
				email,
				undefined,
				-3600,
			);
			expect(() => verifyEmailToken(TEST_AUTH_SECRET, token)).toThrow(
				"Expired email token",
			);
		});

		test("rejects tokens without email", () => {
			const payload = Buffer.from(
				JSON.stringify({ exp: Date.now() / 1000 + 3600 }),
			).toString("base64url");
			const signature = createHmac("sha256", TEST_AUTH_SECRET)
				.update(`header.${payload}`)
				.digest("base64url");
			expect(() =>
				verifyEmailToken(TEST_AUTH_SECRET, `header.${payload}.${signature}`),
			).toThrow("Invalid email token payload");
		});
	});

	describe("helpers", () => {
		test("getAuthResponseError", async () => {
			await expect(
				getAuthResponseError(new Response()),
			).resolves.toBeUndefined();
			await expect(
				getAuthResponseError(Response.json({ code: "FOO" }, { status: 400 })),
			).resolves.toBe("FOO");
			await expect(
				getAuthResponseError(Response.json({}, { status: 400 })),
			).resolves.toBeUndefined();
			await expect(
				getAuthResponseError(Response.json({ code: 42 }, { status: 400 })),
			).resolves.toBeUndefined();
		});

		test("forwardAuthCookies", () => {
			const resHeaders = new Headers();
			forwardAuthCookies(new Response(), resHeaders);
			expect([...resHeaders.entries()]).toHaveLength(0);
			forwardAuthCookies(
				new Response(null, {
					headers: [
						["set-cookie", "a=1"],
						["set-cookie", "b=2"],
					],
				}),
				resHeaders,
			);
			expect(resHeaders.getSetCookie()).toStrictEqual(["a=1", "b=2"]);
		});

		test("getAuthProfiles", async ({ ctx }) => {
			const { id } = await insertAccount(ctx);
			const authDatabase = assertAuthDatabase(ctx);
			await expect(getAuthProfiles(authDatabase, [])).resolves.toStrictEqual(
				new Map(),
			);
			const profiles = await getAuthProfiles(authDatabase, [
				id,
				ctx.getTestUuid(),
			]);
			expect([...profiles.keys()]).toStrictEqual([id]);
			expect(profiles.get(id)?.email).toStrictEqual(expect.any(String));
		});

		test("getAuthProfilesByEmail", async ({ ctx }) => {
			const { email } = await insertAccount(ctx);
			const authDatabase = assertAuthDatabase(ctx);
			const profiles = await getAuthProfilesByEmail(authDatabase, [
				email,
				"missing@example.com",
			]);
			expect([...profiles.keys()]).toStrictEqual([email]);
		});
	});
});
