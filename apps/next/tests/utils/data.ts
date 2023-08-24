import { faker } from "@faker-js/faker";

import { YEAR } from "app/utils/time";
import type { Database } from "next-app/db";
import type {
	AccountsId,
	SessionsSessionId,
	UsersId,
} from "next-app/db/models";
import { generatePasswordData } from "next-app/utils/crypto";

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
	database: Database,
	data: AccountData = {},
) => {
	const password = data.password || faker.internet.password();
	const { salt: passwordSalt, hash: passwordHash } =
		generatePasswordData(password);
	const { id, email, confirmationToken, confirmationTokenTimestamp } =
		await database
			.insertInto("accounts")
			.values({
				id: data.id || faker.string.uuid(),
				email: (data.email || faker.internet.email()).toLowerCase(),
				passwordHash,
				passwordSalt,
				confirmationToken: data.confirmation
					? data.confirmation.token || faker.string.uuid()
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
	database: Database,
	ownerAccountId: AccountsId,
	data: UserData = {},
) => {
	const { id, name } = await database
		.insertInto("users")
		.values({
			id: data.id || faker.string.uuid(),
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
	database: Database,
	ownerAccountId: AccountsId,
	data: Omit<UserData, "id" | "publicName" | "connectedAccountId"> = {},
) =>
	insertUser(database, ownerAccountId, {
		id: ownerAccountId as UsersId,
		connectedAccountId: ownerAccountId,
		...data,
	});

type SessionData = {
	id?: SessionsSessionId;
	expirationTimestamp?: Date;
};

export const insertSession = async (
	database: Database,
	accountId: AccountsId,
	data: SessionData = {},
) => {
	const { sessionId, expirationTimestamp } = await database
		.insertInto("sessions")
		.values({
			sessionId: data.id || faker.string.uuid(),
			accountId,
			expirationTimestamp:
				data.expirationTimestamp || new Date(new Date().valueOf() + YEAR),
		})
		.returning(["sessionId", "expirationTimestamp"])
		.executeTakeFirstOrThrow();
	return { id: sessionId, expirationTimestamp };
};

type AccountWithSessionData = {
	account?: AccountData;
	session?: SessionData;
	user?: Pick<UserData, "name">;
};

export const insertAccountWithSession = async (
	database: Database,
	data: AccountWithSessionData = {},
) => {
	const { id: accountId, ...account } = await insertAccount(
		database,
		data.account,
	);
	const { id: sessionId, ...session } = await insertSession(
		database,
		accountId,
	);
	const { name } = await insertSelfUser(database, accountId, data.user);
	return { accountId, account, sessionId, session, name };
};
