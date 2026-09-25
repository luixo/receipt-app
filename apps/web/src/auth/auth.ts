import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import type { Kysely } from "kysely";
// Better Auth's Kysely adapter requires native Date values and this module is server-only.
// oxlint-disable eslint-js/no-restricted-syntax, import/no-nodejs-modules, typescript/no-unnecessary-condition
import { createHmac, timingSafeEqual } from "node:crypto";

import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from "~app/utils/validation";
import type { Database } from "~db/database";
import type { PeerId, UserId } from "~db/ids";
import { getHash } from "~utils/server/crypto";
import {
	generateConfirmEmailEmail,
	generateResetPasswordEmail,
} from "~web/email/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import type { EmailOptions } from "~web/providers/email";
import { getEmailClient } from "~web/providers/email";

import type { AuthDB } from "./tables";

export type AuthDeps = {
	authDatabase: Kysely<AuthDB>;
	baseUrl: string;
	database: Database;
	emailOptions: EmailOptions;
	getUuid: () => string;
	reqHeaders: Headers;
	secret: string;
};

const asEmailContext = (
	deps: Pick<AuthDeps, "baseUrl" | "emailOptions" | "reqHeaders">,
): UnauthorizedContext =>
	deps as unknown as Pick<
		UnauthorizedContext,
		"emailOptions" | "reqHeaders"
	> as UnauthorizedContext;

const sendEmail = async (
	deps: Pick<AuthDeps, "baseUrl" | "emailOptions" | "reqHeaders">,
	address: string,
	data: { subject: string; body: string },
) => {
	const ctx = asEmailContext(deps);
	await getEmailClient(ctx).send({ address, ...data });
};

export const getAuthOptions = (deps: AuthDeps): BetterAuthOptions => ({
	database: kyselyAdapter(deps.authDatabase.withSchema("auth"), {
		type: "postgres",
	}),
	secret: deps.secret,
	baseURL: deps.baseUrl,
	emailAndPassword: {
		enabled: true,
		minPasswordLength: MIN_PASSWORD_LENGTH,
		maxPasswordLength: MAX_PASSWORD_LENGTH,
		requireEmailVerification: false,
		revokeSessionsOnPasswordReset: false,
		resetPasswordTokenExpiresIn: 24 * 3600,
		sendResetPassword: async ({ user, token }) => {
			if (!deps.emailOptions.getActive()) {
				return;
			}
			const data = await generateResetPasswordEmail(
				token,
				asEmailContext(deps),
			);
			await sendEmail(deps, user.email, data);
		},
		onPasswordReset: async ({ user }) => {
			await deps.authDatabase
				.updateTable("auth.account")
				.set({
					legacyPasswordSalt: null,
					legacyPasswordHash: null,
				})
				.where("userId", "=", user.id)
				.where("providerId", "=", "credential")
				.execute();
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 7 * 24 * 3600,
		sendVerificationEmail: async ({ user, token }) => {
			if (!deps.emailOptions.getActive()) {
				return;
			}
			const data = await generateConfirmEmailEmail(token, asEmailContext(deps));
			await sendEmail(deps, user.email, data);
			await deps.authDatabase
				.updateTable("auth.user")
				.set({ verificationEmailSentAt: new Date() })
				.where("id", "=", user.id)
				.execute();
		},
	},
	session: {
		expiresIn: 30 * 24 * 3600,
		updateAge: 28 * 24 * 3600,
		freshAge: 0,
		cookieCache: { enabled: false },
	},
	user: {
		additionalFields: {
			role: { type: "string", required: false, input: false },
			verificationEmailSentAt: {
				type: "date",
				required: false,
				input: false,
				returned: false,
			},
		},
	},
	account: {
		additionalFields: {
			legacyPasswordSalt: { type: "string", required: false, input: false },
			legacyPasswordHash: { type: "string", required: false, input: false },
		},
	},
	advanced: {
		database: { generateId: () => deps.getUuid() },
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await deps.database
						.insertInto("users")
						.values({
							id: user.id as UserId,
							email: user.email,
							passwordHash: "",
							passwordSalt: "",
							confirmationToken: user.emailVerified ? null : user.id,
							confirmationTokenTimestamp: user.emailVerified
								? null
								: Temporal.Now.zonedDateTimeISO(),
							avatarUrl: user.image ?? null,
							role: typeof user.role === "string" ? user.role : null,
						})
						.execute();
					await deps.database
						.insertInto("peers")
						.values({
							id: user.id as PeerId,
							ownerUserId: user.id as UserId,
							connectedUserId: user.id as UserId,
							name: user.name,
							exposeReceipts: true,
							acceptReceipts: true,
						})
						.execute();
				},
			},
		},
	},
	hooks: {
		before: createAuthMiddleware(async (c) => {
			if (c.path !== "/sign-in/email") {
				return;
			}
			const body = c.body as { email?: unknown; password?: unknown } | null;
			if (
				typeof body?.email !== "string" ||
				typeof body?.password !== "string"
			) {
				return;
			}
			const account = await deps.authDatabase
				.selectFrom("auth.account")
				.innerJoin("auth.user", "auth.user.id", "auth.account.userId")
				.select([
					"auth.account.id",
					"auth.account.legacyPasswordSalt",
					"auth.account.legacyPasswordHash",
				])
				.where("auth.account.providerId", "=", "credential")
				.where("auth.user.email", "=", body.email.toLowerCase())
				.executeTakeFirst();
			if (!account?.legacyPasswordSalt || !account?.legacyPasswordHash) {
				return;
			}
			const isValid =
				(await getHash(body.password, account.legacyPasswordSalt)) ===
				account.legacyPasswordHash;
			if (!isValid) {
				return;
			}
			await deps.authDatabase
				.updateTable("auth.account")
				.set({
					password: await hashPassword(body.password),
					legacyPasswordSalt: null,
					legacyPasswordHash: null,
				})
				.where("id", "=", account.id)
				.execute();
		}),
	},
});

export const getAuth = (deps: AuthDeps) => betterAuth(getAuthOptions(deps));

export type Auth = ReturnType<typeof getAuth>;

export const getRequestAuth = (
	ctx: Pick<
		UnauthorizedContext,
		| "authDatabase"
		| "database"
		| "emailOptions"
		| "getUuid"
		| "reqHeaders"
		| "authSecret"
		| "baseUrl"
	>,
): Auth =>
	getAuth({
		authDatabase: ctx.authDatabase,
		baseUrl: ctx.baseUrl,
		database: ctx.database,
		emailOptions: ctx.emailOptions,
		getUuid: ctx.getUuid,
		reqHeaders: ctx.reqHeaders,
		secret: ctx.authSecret,
	});

export const forwardAuthCookies = (response: Response, resHeaders: Headers) => {
	for (const cookie of response.headers.getSetCookie()) {
		resHeaders.append("Set-Cookie", cookie);
	}
};

export type AuthProfile = {
	id: string;
	email: string;
	image: string | null;
};

/**
 * Batch-loads auth profiles (email/avatar) for the given account ids.
 * Replaces the old `accounts` table joins in domain queries.
 */
export const getAuthProfiles = async (
	authDatabase: Kysely<AuthDB>,
	ids: readonly (string | null)[],
): Promise<Map<string, AuthProfile>> => {
	if (ids.length === 0) {
		return new Map();
	}
	const rows = await authDatabase
		.selectFrom("auth.user")
		.select(["id", "email", "image"])
		.where("id", "in", ids as string[])
		.execute();
	return new Map(rows.map((row) => [row.id, row]));
};

export const getAuthProfilesByEmail = async (
	authDatabase: Kysely<AuthDB>,
	emails: readonly string[],
): Promise<Map<string, AuthProfile>> => {
	if (emails.length === 0) {
		return new Map();
	}
	const rows = await authDatabase
		.selectFrom("auth.user")
		.select(["id", "email", "image"])
		.where("email", "in", [...emails])
		.execute();
	return new Map(rows.map((row) => [row.email, row]));
};

/**
 * Reads the Better Auth error code from an `asResponse: true` call.
 * Failed calls resolve (not reject) with a non-ok response carrying
 * `{ code, message }` JSON, so every adapter checks `response.ok` first.
 */
export const getAuthResponseError = async (
	response: Response,
): Promise<string | undefined> => {
	if (response.ok) {
		return undefined;
	}
	const body = (await response.json()) as { code?: unknown };
	return typeof body.code === "string" ? body.code : undefined;
};

const decodeTokenPayload = (
	token: string,
): { email?: unknown; exp?: unknown } => {
	const [, payload] = token.split(".");
	if (!payload) {
		throw new Error("Invalid email token format");
	}
	return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
		email?: unknown;
		exp?: unknown;
	};
};

/**
 * Verifies a Better Auth email-verification JWT (HS256, secret-signed) and
 * returns the email it was issued for. Used to locate accounts from
 * confirmation tokens without consuming them.
 */
export const verifyEmailToken = (secret: string, token: string): string => {
	const [header, payload, signature] = token.split(".");
	if (!header || !payload || !signature) {
		throw new Error("Invalid email token format");
	}
	const expected = createHmac("sha256", secret)
		.update(`${header}.${payload}`)
		.digest();
	const actual = Buffer.from(signature, "base64url");
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
		throw new Error("Invalid email token signature");
	}
	const data = decodeTokenPayload(token);
	if (typeof data.email !== "string") {
		throw new TypeError("Invalid email token payload");
	}
	if (typeof data.exp === "number" && Date.now() / 1000 > data.exp) {
		throw new Error("Expired email token");
	}
	return data.email;
};
