import { faker } from "@faker-js/faker";

import type { CurrencyCode } from "~app/utils/currency";
import type {
	AccountsId,
	DebtsId,
	ReceiptItemsId,
	ReceiptsId,
	SessionsSessionId,
	UsersId,
} from "~db/models";
import type { TestContext } from "~tests/backend/utils/test";
import { asFixedSizeArray } from "~utils/array";
import { YEAR } from "~utils/time";
import type { Role } from "~web/handlers/receipts/utils";
import { generatePasswordData } from "~web/utils/crypto";

type AccountSettingsData = {
	manualAcceptDebts: boolean;
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
			manualAcceptDebts: data.manualAcceptDebts,
		})
		.executeTakeFirstOrThrow();
};

type UserData = {
	id?: UsersId;
	name?: string;
	publicName?: string;
};

export const insertUser = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	data: UserData = {},
) => {
	const extendedData = data as UserData & { connectedAccountId?: AccountsId };
	const { id, name } = await ctx.database
		.insertInto("users")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name || faker.person.firstName(),
			publicName: data.publicName,
			connectedAccountId: extendedData.connectedAccountId,
		})
		.returning(["id", "name"])
		.executeTakeFirstOrThrow();
	return { id, name, publicName: data.publicName };
};

type AccountData = {
	id?: AccountsId;
	email?: string;
	avatarUrl?: string | null;
	password?: string;
	confirmation?: {
		token?: string;
		timestamp?: Date;
	};
	settings?: AccountSettingsData;
	user?: Pick<UserData, "name">;
	role?: string;
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
	const {
		id,
		email,
		confirmationToken,
		confirmationTokenTimestamp,
		avatarUrl,
	} = await ctx.database
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
			avatarUrl:
				data.avatarUrl === null
					? data.avatarUrl
					: data.avatarUrl || faker.internet.avatar(),
			role: data.role,
		})
		.returning([
			"id",
			"email",
			"confirmationToken",
			"confirmationTokenTimestamp",
			"avatarUrl",
		])
		.executeTakeFirstOrThrow();
	if (data.settings) {
		await insertAccountSettings(ctx, id, data.settings);
	}
	const { id: userId, name } = await ctx.database
		.insertInto("users")
		.values({
			id: id as UsersId,
			ownerAccountId: id,
			name: data.user?.name || faker.person.firstName(),
			connectedAccountId: id,
		})
		.returning(["id", "name"])
		.executeTakeFirstOrThrow();
	return {
		id,
		email,
		password,
		passwordSalt,
		passwordHash,
		confirmationToken,
		confirmationTokenTimestamp,
		userId,
		name,
		avatarUrl: avatarUrl || undefined,
	};
};

type ConnectedUserData = { accountId: AccountsId } & Omit<
	UserData,
	"connectedAccountId"
>;

export const insertConnectedUsers = async (
	ctx: TestContext,
	accountsOrData: [
		AccountsId | ConnectedUserData,
		AccountsId | ConnectedUserData,
	],
) => {
	const asTwoElementsTuple = asFixedSizeArray<2>();
	const dataWithIds = asTwoElementsTuple(
		accountsOrData.map((accountOrDatum, index) => {
			const connectedData = accountsOrData[index === 0 ? 1 : 0];
			const sureData: Omit<ConnectedUserData, "accountId"> =
				typeof accountOrDatum === "string" ? {} : accountOrDatum;
			return {
				accountId:
					typeof accountOrDatum === "string"
						? accountOrDatum
						: accountOrDatum.accountId,
				connectedAccountId:
					typeof connectedData === "string"
						? connectedData
						: connectedData.accountId,
				data: sureData,
			};
		}),
	);
	const [firstResult, secondResult] = asTwoElementsTuple(
		await Promise.all(
			dataWithIds.map(({ accountId, connectedAccountId, data }) =>
				ctx.database
					.insertInto("users")
					.values({
						id: data.id || ctx.getTestUuid(),
						ownerAccountId: accountId,
						name: data.name || faker.person.firstName(),
						publicName: data.publicName,
						connectedAccountId,
					})
					.returning(["id", "name"])
					.executeTakeFirstOrThrow(),
			),
		),
	);
	const [firstDatum, secondDatum] = dataWithIds;
	return asTwoElementsTuple([
		{
			id: firstResult.id,
			name: firstResult.name,
			publicName: firstDatum.data.publicName,
			connectedAccountId: firstDatum.connectedAccountId,
		},
		{
			id: secondResult.id,
			name: secondResult.name,
			publicName: secondDatum.data.publicName,
			connectedAccountId: secondDatum.connectedAccountId,
		},
	]);
};

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
	createdAt?: Date;
	note?: string;
	receiptId?: ReceiptsId;
};

export const insertDebt = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	userId: UsersId,
	data: DebtData = {},
) => {
	const {
		id,
		currencyCode,
		amount,
		timestamp,
		createdAt,
		note,
		updatedAt,
		receiptId,
	} = await ctx.database
		.insertInto("debts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			userId,
			currencyCode: data.currencyCode || faker.finance.currencyCode(),
			amount:
				data.amount?.toString() ??
				(faker.datatype.boolean() ? "" : "-") + faker.finance.amount(),
			timestamp: data.timestamp ?? new Date(),
			createdAt: data.createdAt ?? new Date(),
			note: data.note ?? faker.lorem.sentence(),
			receiptId: data.receiptId ?? null,
		})
		.returning([
			"id",
			"currencyCode",
			"amount",
			"timestamp",
			"createdAt",
			"note",
			"updatedAt",
			"receiptId",
		])
		.executeTakeFirstOrThrow();
	return {
		id,
		currencyCode,
		amount: Number(amount),
		timestamp,
		createdAt,
		note,
		updatedAt,
		receiptId,
	};
};

const updateDebt = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	debtId: DebtsId,
) => {
	const debt = await ctx.database
		.selectFrom("debts")
		.where((eb) =>
			eb.and([
				eb("debts.ownerAccountId", "=", ownerAccountId),
				eb("debts.id", "=", debtId),
			]),
		)
		.select("debts.note")
		.executeTakeFirst();
	if (!debt) {
		throw new Error(
			`Expected to update debt id "${debtId}" of account id "${ownerAccountId}", but find none.`,
		);
	}
	const { updatedAt } = await ctx.database
		.updateTable("debts")
		.where((eb) =>
			eb.and([
				eb("debts.ownerAccountId", "=", ownerAccountId),
				eb("debts.id", "=", debtId),
			]),
		)
		.set({ note: debt.note })
		.returning("debts.updatedAt")
		.executeTakeFirstOrThrow();
	return { updatedAt };
};

type ReturnDebtData = Awaited<ReturnType<typeof insertDebt>>;

export const insertSyncedDebts = async (
	ctx: TestContext,
	[ownerAccountId, userId, data = {}]: [AccountsId, UsersId, DebtData?],
	[foreignOwnerAccountId, foreignUserId]: [AccountsId, UsersId],
	desync?: {
		fn?: (input: ReturnDebtData) => ReturnDebtData;
		ahead?: "our" | "their";
	},
) => {
	const originalDebt = await insertDebt(ctx, ownerAccountId, userId, data);
	const reverseDebtObject = desync?.fn ? desync.fn(originalDebt) : originalDebt;
	const reverseDebt = await insertDebt(
		ctx,
		foreignOwnerAccountId,
		foreignUserId,
		{
			id: reverseDebtObject.id,
			currencyCode: reverseDebtObject.currencyCode,
			amount: -Number(reverseDebtObject.amount),
			timestamp: reverseDebtObject.timestamp,
			createdAt: reverseDebtObject.createdAt,
			note: reverseDebtObject.note,
			receiptId: reverseDebtObject.receiptId || undefined,
		},
	);
	switch (desync?.ahead) {
		case "our": {
			const { updatedAt: selfUpdatedAt } = await updateDebt(
				ctx,
				ownerAccountId,
				reverseDebt.id,
			);
			originalDebt.updatedAt = selfUpdatedAt;
			break;
		}
		case "their": {
			const { updatedAt: reverseUpdatedAt } = await updateDebt(
				ctx,
				foreignOwnerAccountId,
				reverseDebt.id,
			);
			reverseDebt.updatedAt = reverseUpdatedAt;
			break;
		}
		default:
			break;
	}
	return [originalDebt, reverseDebt] as const;
};

type ReceiptData = {
	id?: ReceiptsId;
	currencyCode?: CurrencyCode;
	name?: string;
	createdAt?: Date;
	issued?: Date;
	transferIntentionAccountId?: AccountsId;
};

export const insertReceipt = async (
	ctx: TestContext,
	ownerAccountId: AccountsId,
	data: ReceiptData = {},
) => {
	const {
		id,
		currencyCode,
		name,
		createdAt,
		issued,
		transferIntentionAccountId,
	} = await ctx.database
		.insertInto("receipts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name ?? faker.lorem.words(2),
			currencyCode: data.currencyCode || faker.finance.currencyCode(),
			createdAt: data.createdAt ?? new Date(),
			issued: data.issued ?? new Date(),
			transferIntentionAccountId: data.transferIntentionAccountId,
		})
		.returning([
			"id",
			"currencyCode",
			"name",
			"createdAt",
			"issued",
			"transferIntentionAccountId",
		])
		.executeTakeFirstOrThrow();
	return {
		id,
		currencyCode,
		name,
		createdAt,
		issued,
		ownerAccountId,
		transferIntentionAccountId,
	};
};

type ReceiptParticipantData = {
	role?: Exclude<Role, "owner">;
	createdAt?: Date;
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
	const { createdAt, role } = await ctx.database
		.insertInto("receiptParticipants")
		.values({
			receiptId,
			userId,
			role: userId === ownerAccountId ? "owner" : data.role ?? "viewer",
			createdAt: data.createdAt ?? new Date(),
		})
		.returning(["createdAt", "role"])
		.executeTakeFirstOrThrow();
	return { createdAt, userId, role: role as Role };
};

type ReceiptItemData = {
	id?: ReceiptItemsId;
	name?: string;
	price?: number;
	quantity?: number;
	createdAt?: Date;
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
	const { id, name, price, quantity, createdAt } = await ctx.database
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
			createdAt: data.createdAt ?? new Date(),
		})
		.returning(["id", "name", "price", "quantity", "createdAt"])
		.executeTakeFirstOrThrow();
	return { id, name, price, quantity, createdAt };
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
	return { part, userId, itemId };
};

type AccountConnectionIntentionData = {
	createdAt?: Date;
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
			createdAt: data.createdAt ?? new Date(),
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
	const {
		id: accountId,
		userId,
		name,
		...account
	} = await insertAccount(ctx, data.account);
	const { id: sessionId, ...session } = await insertSession(
		ctx,
		accountId,
		data.session,
	);
	return { accountId, account, sessionId, session, userId, name };
};
