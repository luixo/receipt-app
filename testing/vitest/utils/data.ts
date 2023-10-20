import { faker } from "@faker-js/faker";

import type { TestContext } from "@tests/backend/utils/test";
import type { CurrencyCode } from "app/utils/currency";
import { YEAR } from "app/utils/time";
import type {
	AccountsId,
	DebtsId,
	ReceiptItemsId,
	ReceiptsId,
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
	return {
		id,
		name,
		publicName: data.publicName,
		connectedAccountId: data.connectedAccountId,
	};
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

type DebtData = {
	id?: DebtsId;
	currencyCode?: CurrencyCode;
	amount?: number;
	timestamp?: Date;
	created?: Date;
	note?: string;
	lockedTimestamp?: Date;
	receiptId?: ReceiptsId;
};

export const insertDebt = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	userId: UsersId,
	data: DebtData = {},
) => {
	const { id, currencyCode, amount, timestamp, created, note } =
		await ctx.database
			.insertInto("debts")
			.values({
				id: data.id || ctx.getTestUuid(),
				ownerAccountId,
				userId,
				currencyCode: data.currencyCode || faker.finance.currencyCode(),
				amount: data.amount?.toString() ?? faker.finance.amount(),
				timestamp: data.timestamp ?? new Date(),
				created: data.created ?? new Date(),
				note: data.note ?? faker.lorem.sentence(),
				lockedTimestamp: data.lockedTimestamp ?? null,
				receiptId: data.receiptId ?? null,
			})
			.returning([
				"id",
				"currencyCode",
				"amount",
				"timestamp",
				"created",
				"note",
			])
			.executeTakeFirstOrThrow();
	return { id, currencyCode, amount, timestamp, created, note };
};

type ReceiptData = {
	id?: ReceiptsId;
	currencyCode?: CurrencyCode;
	name?: string;
	created?: Date;
	issued?: Date;
	lockedTimestamp?: Date;
};

export const insertReceipt = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	data: ReceiptData = {},
) => {
	const { id, currencyCode, name, created, issued } = await ctx.database
		.insertInto("receipts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name ?? faker.lorem.words(2),
			currencyCode: data.currencyCode || faker.finance.currencyCode(),
			created: data.created ?? new Date(),
			issued: data.issued ?? new Date(),
			lockedTimestamp: data.lockedTimestamp ?? null,
		})
		.returning(["id", "currencyCode", "name", "created", "issued"])
		.executeTakeFirstOrThrow();
	return { id, currencyCode, name, created, issued };
};

type ReceiptParticipantData = {
	resolved?: boolean;
	added?: Date;
};

export const insertReceiptParticipant = async (
	ctx: TestContext,
	receiptId: ReceiptsId,
	userId: UsersId,
	data: ReceiptParticipantData = {},
) => {
	const { ownerAccountId } = await ctx.database
		.selectFrom("receipts")
		.select("ownerAccountId")
		.where("receipts.id", "=", receiptId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt id ${receiptId} in tests`),
		);
	const { added } = await ctx.database
		.insertInto("receiptParticipants")
		.values({
			receiptId,
			userId,
			role: userId === ownerAccountId ? "admin" : "user",
			resolved: data.resolved ?? false,
			added: data.added ?? new Date(),
		})
		.returning(["added"])
		.executeTakeFirstOrThrow();
	return { added };
};

type ReceiptItemData = {
	id?: ReceiptItemsId;
	name?: string;
	price?: number;
	quantity?: number;
};

export const insertReceiptItem = async (
	ctx: TestContext,
	receiptId: ReceiptsId,
	data: ReceiptItemData = {},
) => {
	await ctx.database
		.selectFrom("receipts")
		.where("receipts.id", "=", receiptId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt id ${receiptId} in tests`),
		);
	const { id, name, price, quantity } = await ctx.database
		.insertInto("receiptItems")
		.values({
			receiptId,
			id: data.id || ctx.getTestUuid(),
			name: data.name ?? faker.commerce.product(),
			price: (
				data.price ??
				faker.number.float({ min: 1, max: 10000, precision: 0.01 })
			).toString(),
			quantity: (
				data.quantity ?? faker.number.int({ min: 1, max: 5 })
			).toString(),
		})
		.returning(["id", "name", "price", "quantity"])
		.executeTakeFirstOrThrow();
	return { id, name, price, quantity };
};

type ItemParticipantData = {
	part?: number;
};

export const insertItemParticipant = async (
	ctx: TestContext,
	itemId: ReceiptItemsId,
	userId: UsersId,
	data: ItemParticipantData = {},
) => {
	await ctx.database
		.selectFrom("receiptItems")
		.where("receiptItems.id", "=", itemId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt item id ${itemId} in tests`),
		);
	const { part } = await ctx.database
		.insertInto("itemParticipants")
		.values({
			userId,
			itemId,
			part: (data.part ?? 1).toString(),
		})
		.returning(["part"])
		.executeTakeFirstOrThrow();
	return { part };
};

type AccountSettingsData = {
	autoAcceptDebts: boolean;
};

export const insertAccountSettings = async (
	ctx: TestContext,
	accountId: AccountsId,
	data: AccountSettingsData,
) => {
	await ctx.database
		.insertInto("accountSettings")
		.values({
			accountId,
			autoAcceptDebts: data.autoAcceptDebts,
		})
		.executeTakeFirstOrThrow();
};

type AccountConnectionIntentionData = {
	created?: Date;
};

export const insertAccountConnectionIntention = async (
	ctx: TestContext,
	accountId: AccountsId,
	targetAccountId: AccountsId,
	userId: UsersId,
	data: AccountConnectionIntentionData = {},
) => {
	await ctx.database
		.insertInto("accountConnectionsIntentions")
		.values({
			accountId,
			targetAccountId,
			userId,
			created: data.created ?? new Date(),
		})
		.executeTakeFirstOrThrow();
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
	const { id: userId, name } = await insertSelfUser(ctx, accountId, data.user);
	return { accountId, account, sessionId, session, userId, name };
};
