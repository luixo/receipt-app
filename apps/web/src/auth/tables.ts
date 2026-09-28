// Better Auth's adapter requires native Date values at the database boundary.
// oxlint-disable eslint-js/no-restricted-syntax
import type { Generated } from "~db/types.gen";

/**
 * Better Auth tables live in the `auth` Postgres schema, separate from the
 * domain tables in `public`. The app never touches them directly except
 * through the Better Auth instance; this type exists for the few raw
 * operations Better Auth has no endpoint for (legacy-hash migration,
 * intention rate limits, admin listing, session cleanup).
 */
export type AuthUser = {
	createdAt: Generated<Date>;
	email: string;
	emailVerified: boolean;
	id: string;
	image: string | null;
	name: string;
	role: string | null;
	updatedAt: Generated<Date>;
	verificationEmailSentAt: Date | null;
};

export type AuthSession = {
	createdAt: Generated<Date>;
	expiresAt: Date;
	id: string;
	ipAddress: string | null;
	token: string;
	updatedAt: Generated<Date>;
	userAgent: string | null;
	userId: string;
};

export type AuthAccount = {
	accessToken: string | null;
	accessTokenExpiresAt: Date | null;
	accountId: string;
	createdAt: Generated<Date>;
	id: string;
	idToken: string | null;
	legacyPasswordHash: string | null;
	legacyPasswordSalt: string | null;
	password: string | null;
	providerId: string;
	refreshToken: string | null;
	refreshTokenExpiresAt: Date | null;
	scope: string | null;
	updatedAt: Generated<Date>;
	userId: string;
};

export type AuthVerification = {
	createdAt: Generated<Date>;
	expiresAt: Date;
	id: string;
	identifier: string;
	updatedAt: Generated<Date>;
	value: string;
};

export type AuthDB = {
	"auth.account": AuthAccount;
	"auth.session": AuthSession;
	"auth.user": AuthUser;
	"auth.verification": AuthVerification;
};
