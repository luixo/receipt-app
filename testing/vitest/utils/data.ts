import { faker } from "@faker-js/faker";
import { assert } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import type {
	AccountId,
	DebtId,
	PeerId,
	ReceiptId,
	ReceiptItemId,
	SessionId,
} from "~db/ids";
import type { ReceiptRole } from "~db/types.gen";
import type { TestContext } from "~tests/backend/utils/test";
import { asFixedSizeArray } from "~utils/array";
import { generatePasswordData } from "~utils/server/crypto";

export const assertDatabase = (ctx: TestContext) => {
	assert(ctx.database, "This test required DB to exist");
	return ctx.database.instance;
};

export type AccountSettingsData = {
	manualAcceptDebts: boolean;
};

export const insertAccountSettings = async (
	ctx: TestContext,
	accountId: AccountId,
	data: AccountSettingsData,
) => {
	const database = assertDatabase(ctx);
	await database
		.insertInto("accountSettings")
		.values({
			accountId,
			manualAcceptDebts: data.manualAcceptDebts,
		})
		.executeTakeFirstOrThrow();
};

type PeerData = {
	connectedAccountId?: AccountId;
	id?: PeerId;
	name?: string;
	publicName?: string;
};

export const insertPeer = async (
	ctx: TestContext,
	ownerAccountId: AccountId,
	data: PeerData = {},
) => {
	const database = assertDatabase(ctx);
	const { id, name } = await database
		.insertInto("peers")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name || faker.person.firstName(),
			publicName: data.publicName,
			connectedAccountId: data.connectedAccountId,
		})
		.returning(["id", "name"])
		.executeTakeFirstOrThrow();
	return { id, name, publicName: data.publicName };
};

type AccountData = {
	id?: AccountId;
	email?: string;
	avatarUrl?: string | null;
	password?: string;
	confirmation?: {
		token?: string;
		timestamp?: Temporal.ZonedDateTime;
	};
	settings?: AccountSettingsData;
	peer?: Pick<PeerData, "name">;
	role?: string;
};

export const insertAccount = async (
	ctx: TestContext,
	data: AccountData = {},
) => {
	const database = assertDatabase(ctx);
	const password = data.password || faker.internet.password();
	const { salt: passwordSalt, hash: passwordHash } = await generatePasswordData(
		{ getSalt: ctx.getTestSalt },
		password,
	);
	const {
		id,
		email,
		confirmationToken,
		confirmationTokenTimestamp,
		avatarUrl,
	} = await database
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
				? data.confirmation.timestamp || Temporal.Now.zonedDateTimeISO()
				: undefined,
			avatarUrl:
				data.avatarUrl === null
					? data.avatarUrl
					: data.avatarUrl || faker.image.avatar(),
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
	const { id: peerId, name } = await database
		.insertInto("peers")
		.values({
			id: id as PeerId,
			ownerAccountId: id,
			name: data.peer?.name || faker.person.firstName(),
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
		peerId,
		name,
		avatarUrl: avatarUrl || undefined,
	};
};

type ConnectedPeerData = { accountId: AccountId } & Omit<
	PeerData,
	"connectedAccountId"
>;

export const insertConnectedPeers = async (
	ctx: TestContext,
	accountsOrData: [
		AccountId | ConnectedPeerData,
		AccountId | ConnectedPeerData,
	],
) => {
	const database = assertDatabase(ctx);
	const asTwoElementsTuple = asFixedSizeArray<2>();
	const dataWithIds = asTwoElementsTuple(
		accountsOrData.map((accountOrDatum, index) => {
			const connectedData = accountsOrData[index === 0 ? 1 : 0];
			const sureData: Omit<ConnectedPeerData, "accountId"> =
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
				database
					.insertInto("peers")
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
	id?: SessionId;
	expirationTimestamp?: Temporal.ZonedDateTime;
};

export const insertSession = async (
	ctx: TestContext,
	accountId: AccountId,
	data: SessionData = {},
) => {
	const database = assertDatabase(ctx);
	const { sessionId, expirationTimestamp } = await database
		.insertInto("sessions")
		.values({
			sessionId: data.id || ctx.getTestUuid(),
			accountId,
			expirationTimestamp:
				data.expirationTimestamp ||
				Temporal.Now.zonedDateTimeISO().add({ years: 1 }),
		})
		.returning(["sessionId", "expirationTimestamp"])
		.executeTakeFirstOrThrow();
	return { id: sessionId, expirationTimestamp };
};

type ResetPasswordIntentionData = {
	id?: SessionId;
	expiresTimestamp?: Temporal.ZonedDateTime;
	token?: string;
};

export const insertResetPasswordIntention = async (
	ctx: TestContext,
	accountId: AccountId,
	data: ResetPasswordIntentionData = {},
) => {
	const database = assertDatabase(ctx);
	const { token, expiresTimestamp } = await database
		.insertInto("resetPasswordIntentions")
		.values({
			accountId,
			expiresTimestamp:
				data.expiresTimestamp ||
				Temporal.Now.zonedDateTimeISO().add({ years: 1 }),
			token: data.token || ctx.getTestUuid(),
		})
		.returning(["expiresTimestamp", "token"])
		.executeTakeFirstOrThrow();
	return { token, expiresTimestamp };
};

type DebtData = {
	id?: DebtId;
	currencyCode?: CurrencyCode;
	amount?: number;
	timestamp?: Temporal.PlainDate;
	createdAt?: Temporal.ZonedDateTime;
	note?: string;
	receiptId?: ReceiptId;
};

export const insertDebt = async (
	ctx: TestContext,
	ownerAccountId: AccountId,
	peerId: PeerId,
	data: DebtData = {},
) => {
	const database = assertDatabase(ctx);
	const {
		id,
		currencyCode,
		amount,
		timestamp,
		createdAt,
		note,
		updatedAt,
		receiptId,
	} = await database
		.insertInto("debts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			peerId,
			currencyCode: data.currencyCode || faker.finance.currencyCode(),
			amount:
				data.amount?.toString() ??
				(faker.datatype.boolean() ? "" : "-") + faker.finance.amount(),
			timestamp: data.timestamp ?? Temporal.Now.plainDateISO(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
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

export type InsertedDebt = Awaited<ReturnType<typeof insertDebt>>;

const updateDebt = async (
	ctx: TestContext,
	ownerAccountId: AccountId,
	debtId: DebtId,
) => {
	const database = assertDatabase(ctx);
	const debt = await database
		.selectFrom("debts")
		.where((eb) =>
			eb.and([
				eb("debts.ownerAccountId", "=", ownerAccountId),
				eb("debts.id", "=", debtId),
			]),
		)
		.select("debts.note")
		.limit(1)
		.executeTakeFirst();
	if (!debt) {
		throw new Error(
			`Expected to update debt id "${debtId}" of account id "${ownerAccountId}", but find none.`,
		);
	}
	const { updatedAt } = await database
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
	[ownerAccountId, peerId, data = {}]: [AccountId, PeerId, DebtData?],
	[foreignOwnerAccountId, foreignPeerId]: [AccountId, PeerId],
	desync?: {
		fn?: (input: ReturnDebtData) => ReturnDebtData;
		ahead?: "our" | "their";
	},
) => {
	const originalDebt = await insertDebt(ctx, ownerAccountId, peerId, data);
	const reverseDebtObject = desync?.fn ? desync.fn(originalDebt) : originalDebt;
	const reverseDebt = await insertDebt(
		ctx,
		foreignOwnerAccountId,
		foreignPeerId,
		{
			id: reverseDebtObject.id,
			currencyCode: reverseDebtObject.currencyCode,
			amount: -reverseDebtObject.amount,
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
	id?: ReceiptId;
	currencyCode?: CurrencyCode;
	name?: string;
	createdAt?: Temporal.ZonedDateTime;
	issued?: Temporal.PlainDate;
};

export const insertReceipt = async (
	ctx: TestContext,
	ownerAccountId: AccountId,
	data: ReceiptData = {},
) => {
	const database = assertDatabase(ctx);
	const { id, currencyCode, name, createdAt, issued } = await database
		.insertInto("receipts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerAccountId,
			name: data.name ?? faker.lorem.words(2),
			currencyCode: data.currencyCode || faker.finance.currencyCode(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
			issued: data.issued ?? Temporal.Now.plainDateISO(),
		})
		.returning(["id", "currencyCode", "name", "createdAt", "issued"])
		.executeTakeFirstOrThrow();
	await database
		.insertInto("receiptItems")
		.values({
			name: "",
			price: "0",
			quantity: "0",
			id: id as ReceiptItemId,
			receiptId: id,
		})
		.execute();
	return {
		id,
		currencyCode,
		name,
		createdAt,
		issued,
		ownerAccountId,
	};
};

type ReceiptParticipantData = {
	role?: Exclude<ReceiptRole, "owner">;
	createdAt?: Temporal.ZonedDateTime;
};

export const insertReceiptParticipant = async (
	ctx: TestContext,
	receiptId: ReceiptId,
	peerId: PeerId,
	data: ReceiptParticipantData = {},
) => {
	const database = assertDatabase(ctx);
	const { ownerAccountId } = await database
		.selectFrom("receipts")
		.select("ownerAccountId")
		.where("receipts.id", "=", receiptId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt id ${receiptId} in tests`),
		);
	const { createdAt, role } = await database
		.insertInto("receiptParticipants")
		.values({
			receiptId,
			peerId,
			role: peerId === ownerAccountId ? "owner" : (data.role ?? "viewer"),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
		})
		.returning(["createdAt", "role"])
		.executeTakeFirstOrThrow();
	return { createdAt, peerId, role };
};

type ReceiptPayerData = {
	part?: number;
	createdAt?: Temporal.ZonedDateTime;
};

export const insertReceiptPayer = async (
	ctx: TestContext,
	receiptId: ReceiptId,
	peerId: PeerId,
	data: ReceiptPayerData = {},
) => {
	const database = assertDatabase(ctx);
	const { createdAt, part } = await database
		.insertInto("receiptItemConsumers")
		.values({
			itemId: receiptId as ReceiptItemId,
			peerId,
			part: (data.part ?? 1).toString(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
		})
		.returning(["createdAt", "part"])
		.executeTakeFirstOrThrow();
	return { createdAt, peerId, part };
};

type ReceiptItemData = {
	id?: ReceiptItemId;
	name?: string;
	price?: number;
	quantity?: number;
	createdAt?: Temporal.ZonedDateTime;
};

export const insertReceiptItem = async (
	ctx: TestContext,
	receiptId: ReceiptId,
	data: ReceiptItemData = {},
) => {
	const database = assertDatabase(ctx);
	await database
		.selectFrom("receipts")
		.where("receipts.id", "=", receiptId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt id ${receiptId} in tests`),
		);
	const { id, name, price, quantity, createdAt } = await database
		.insertInto("receiptItems")
		.values({
			receiptId,
			id: data.id || ctx.getTestUuid(),
			name:
				data.name ??
				`${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
			price: (
				data.price ??
				faker.number.float({ min: 1, max: 10_000, multipleOf: 0.01 })
			).toString(),
			quantity: (
				data.quantity ?? faker.number.int({ min: 1, max: 5 })
			).toString(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
		})
		.returning(["id", "name", "price", "quantity", "createdAt"])
		.executeTakeFirstOrThrow();
	return { id, name, price, quantity, createdAt };
};

type ReceiptItemConsumerData = {
	part?: number;
	createdAt?: Temporal.ZonedDateTime;
};

export const insertReceiptItemConsumer = async (
	ctx: TestContext,
	itemId: ReceiptItemId,
	peerId: PeerId,
	data: ReceiptItemConsumerData = {},
) => {
	const database = assertDatabase(ctx);
	await database
		.selectFrom("receiptItems")
		.where("receiptItems.id", "=", itemId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt item id ${itemId} in tests`),
		);
	const { part, createdAt } = await database
		.insertInto("receiptItemConsumers")
		.values({
			peerId,
			itemId,
			part: (data.part ?? 1).toString(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
		})
		.returning(["part", "createdAt"])
		.executeTakeFirstOrThrow();
	return { part, createdAt, peerId, itemId };
};

type ReceiptItemPayerData = {
	part?: number;
	createdAt?: Temporal.ZonedDateTime;
};

export const insertReceiptItemPayer = async (
	ctx: TestContext,
	itemId: ReceiptItemId,
	peerId: PeerId,
	data: ReceiptItemPayerData = {},
) => {
	const database = assertDatabase(ctx);
	await database
		.selectFrom("receiptItems")
		.where("receiptItems.id", "=", itemId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt item id ${itemId} in tests`),
		);
	const { part, createdAt } = await database
		.insertInto("receiptItemPayers")
		.values({
			peerId,
			itemId,
			part: (data.part ?? 1).toString(),
			createdAt: data.createdAt ?? Temporal.Now.zonedDateTimeISO(),
		})
		.returning(["part", "createdAt"])
		.executeTakeFirstOrThrow();
	return { part, createdAt, peerId, itemId };
};

type AccountWithSessionData = {
	account?: AccountData;
	session?: SessionData;
	peer?: Pick<PeerData, "name">;
};

export const insertAccountWithSession = async (
	ctx: TestContext,
	data: AccountWithSessionData = {},
) => {
	const {
		id: accountId,
		peerId,
		name,
		...account
	} = await insertAccount(ctx, data.account);
	const { id: sessionId, ...session } = await insertSession(
		ctx,
		accountId,
		data.session,
	);
	return { accountId, account, sessionId, session, peerId, name };
};
