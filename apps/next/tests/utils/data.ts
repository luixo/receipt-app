import { faker } from "@faker-js/faker";

import { YEAR } from "app/utils/time";
import type {
	AccountsId,
	SessionsSessionId,
	UsersId,
} from "next-app/db/models";
import { generatePasswordData } from "next-app/utils/crypto";
import type { TestContext } from "next-tests/utils/test";

type AccountData = {
	id?: AccountsId;
	email?: string;
	password?: string;
	confirmation?: {
		token?: string;
		timestamp?: Date;
	};
};

export const insertAccount = async (
	ctx: TestContext,
	data: AccountData = {},
) => {
	const password = data.password || faker.internet.password();
	const { salt: passwordSalt, hash: passwordHash } = generatePasswordData(
		{ getSalt: ctx.getTestSalt },
		password,
	);
	const { id, email, confirmationToken, confirmationTokenTimestamp } =
		await ctx.database
			.insertInto("accounts")
			.values({
				id: data.id || ctx.getTestUuid(),
				email: (data.email || faker.internet.email()).toLowerCase(),
				passwordHash,
				passwordSalt,
				confirmationToken: data.confirmation
					? data.confirmation.token || ctx.getTestUuid()
					: undefined,
				confirmationTokenTimestamp: data.confirmation
					? data.confirmation.timestamp || new Date()
					: undefined,
			})
			.returning([
				"id",
				"email",
				"confirmationToken",
				"confirmationTokenTimestamp",
			])
			.executeTakeFirstOrThrow();
	return {
		id,
		email,
		password,
		passwordSalt,
		passwordHash,
		confirmationToken,
		confirmationTokenTimestamp,
	};
};

type UserData = {
	id?: UsersId;
	name?: string;
	publicName?: string;
	connectedAccountId?: AccountsId;
};

export const insertUser = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	data: UserData = {},
) => {
	const { id, name } = await ctx.database
		.insertInto("users")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name || faker.person.firstName(),
			publicName: data.publicName,
			connectedAccountId: data.connectedAccountId,
		})
		.returning(["id", "name"])
		.executeTakeFirstOrThrow();
	return { id, name };
};

export const insertSelfUser = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	data: Omit<UserData, "id" | "publicName" | "connectedAccountId"> = {},
) =>
	insertUser(ctx, ownerAccountId, {
		id: ownerAccountId as UsersId,
		connectedAccountId: ownerAccountId,
		...data,
	});

type SessionData = {
	id?: SessionsSessionId;
	expirationTimestamp?: Date;
};

export const insertSession = async (
	ctx: TestContext,
	accountId: AccountsId,
	data: SessionData = {},
) => {
	const { sessionId, expirationTimestamp } = await ctx.database
		.insertInto("sessions")
		.values({
			sessionId: data.id || ctx.getTestUuid(),
			accountId,
			expirationTimestamp:
				data.expirationTimestamp || new Date(new Date().valueOf() + YEAR),
		})
		.returning(["sessionId", "expirationTimestamp"])
		.executeTakeFirstOrThrow();
	return { id: sessionId, expirationTimestamp };
};

type ResetPasswordIntentionData = {
	id?: SessionsSessionId;
	expiresTimestamp?: Date;
	token?: string;
};

export const insertResetPasswordIntention = async (
	ctx: TestContext,
	accountId: AccountsId,
	data: ResetPasswordIntentionData = {},
) => {
	const { token, expiresTimestamp } = await ctx.database
		.insertInto("resetPasswordIntentions")
		.values({
			accountId,
			expiresTimestamp:
				data.expiresTimestamp || new Date(new Date().valueOf() + YEAR),
			token: data.token || ctx.getTestUuid(),
		})
		.returning(["expiresTimestamp", "token"])
		.executeTakeFirstOrThrow();
	return { token, expiresTimestamp };
};

type AccountWithSessionData = {
	account?: AccountData;
	session?: SessionData;
	user?: Pick<UserData, "name">;
};

export const insertAccountWithSession = async (
	ctx: TestContext,
	data: AccountWithSessionData = {},
) => {
	const { id: accountId, ...account } = await insertAccount(ctx, data.account);
	const { id: sessionId, ...session } = await insertSession(ctx, accountId);
	const { name } = await insertSelfUser(ctx, accountId, data.user);
	return { accountId, account, sessionId, session, name };
};
