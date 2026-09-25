import { sql } from "kysely";

import type { Database } from "~db/database";

const references = [
	["peers", "ownerUserId", "CASCADE"],
	["peers", "connectedUserId", "SET NULL"],
	["receipts", "ownerUserId", "CASCADE"],
	["debts", "ownerUserId", "CASCADE"],
	["userSettings", "userId", "CASCADE"],
] as const;

const dropUserReferences = async (db: Database) => {
	const result = await sql<{ table: string; constraint: string }>`
		SELECT owner.relname AS "table", c.conname AS "constraint"
		FROM pg_constraint c
		JOIN pg_class target ON target.oid = c.confrelid
		JOIN pg_class owner ON owner.oid = c.conrelid
		JOIN pg_namespace ns ON ns.oid = target.relnamespace
		WHERE c.contype = 'f' AND ns.nspname = 'public' AND target.relname = 'users'
	`.execute(db);
	for (const { table, constraint } of result.rows) {
		await sql`ALTER TABLE "public".${sql.id(table)} DROP CONSTRAINT ${sql.id(constraint)}`.execute(
			db,
		);
	}
};

const createAuthSchema = async (db: Database) => {
	await sql`
		CREATE SCHEMA IF NOT EXISTS "auth";
		CREATE TABLE "auth"."user" (
			"id" uuid NOT NULL PRIMARY KEY, "name" text NOT NULL,
			"email" text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL,
			"image" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"role" text, "verificationEmailSentAt" timestamptz
		);
		CREATE TABLE "auth"."session" (
			"id" uuid NOT NULL PRIMARY KEY, "expiresAt" timestamptz NOT NULL,
			"token" text NOT NULL UNIQUE, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updatedAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text,
			"userId" uuid NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE
		);
		CREATE TABLE "auth"."account" (
			"id" uuid NOT NULL PRIMARY KEY, "accountId" text NOT NULL,
			"providerId" text NOT NULL, "userId" uuid NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
			"accessToken" text, "refreshToken" text, "idToken" text,
			"accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
			"scope" text, "password" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updatedAt" timestamptz NOT NULL, "legacyPasswordSalt" text, "legacyPasswordHash" text
		);
		CREATE TABLE "auth"."verification" (
			"id" uuid NOT NULL PRIMARY KEY, "identifier" text NOT NULL, "value" text NOT NULL,
			"expiresAt" timestamptz NOT NULL, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updatedAt" timestamptz NOT NULL
		);
		CREATE INDEX "session_userId_idx" ON "auth"."session" ("userId");
		CREATE INDEX "account_userId_idx" ON "auth"."account" ("userId");
		CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");
	`.execute(db);
};

const backfill = async (db: Database) => {
	await sql`
		INSERT INTO "auth"."user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "role")
		SELECT "id", "email", "email", "confirmationToken" IS NULL, "avatarUrl", "createdAt", "updatedAt", "role" FROM "users"
	`.execute(db);
	await sql`
		INSERT INTO "auth"."account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt", "legacyPasswordSalt", "legacyPasswordHash")
		SELECT "id", "id"::text, 'credential', "id", NULL, "createdAt", "updatedAt", "passwordSalt", "passwordHash" FROM "users"
	`.execute(db);
};

export const up = async (db: Database) => {
	await createAuthSchema(db);
	await backfill(db);
	await dropUserReferences(db);
	for (const [table, column, onDelete] of references) {
		await sql`ALTER TABLE "public".${sql.id(table)} ADD CONSTRAINT ${sql.id(`${table}:${column}:auth-user`)} FOREIGN KEY (${sql.id(column)}) REFERENCES "auth"."user" ("id") ON UPDATE CASCADE ON DELETE ${sql.raw(onDelete)}`.execute(
			db,
		);
	}
};

export const down = async (db: Database) => {
	for (const [table, column] of references) {
		await sql`ALTER TABLE "public".${sql.id(table)} DROP CONSTRAINT IF EXISTS ${sql.id(`${table}:${column}:auth-user`)}`.execute(
			db,
		);
	}
	await sql`DROP SCHEMA IF EXISTS "auth" CASCADE`.execute(db);
};
