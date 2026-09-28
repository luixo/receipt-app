// Better Auth's adapter requires native Date values at the database boundary.
// oxlint-disable eslint-js/no-restricted-syntax
import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { createHmac } from "node:crypto";
import { assert } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import type {
	DebtId,
	PeerId,
	ReceiptId,
	ReceiptItemId,
	SessionId,
	UserId,
} from "~db/ids";
import type { ReceiptRole } from "~db/types.gen";
import { TEST_AUTH_SECRET } from "~tests/backend/utils/context";
import type { TestContext } from "~tests/backend/utils/test";
import { asFixedSizeArray } from "~utils/array";
import { generatePasswordData } from "~utils/server/crypto";
import { getAuthDatabase } from "~web/auth/database";

export const assertDatabase = (ctx: TestContext) => {
	assert(ctx.database, "This test required DB to exist");
	return ctx.database.instance;
};

export const assertAuthDatabase = (ctx: TestContext) => {
	assert(ctx.database, "This test required DB to exist");
	return getAuthDatabase(ctx.database.connectionString);
};

export const signSessionCookie = (token: string) => {
	const signature = createHmac("sha256", TEST_AUTH_SECRET)
		.update(token)
		.digest("base64");
	return encodeURIComponent(`${token}.${signature}`);
};

export type UserSettingsData = {
	manualAcceptDebts: boolean;
};

export const insertUserSettings = async (
	ctx: TestContext,
	userId: UserId,
	data: UserSettingsData,
) => {
	const database = assertDatabase(ctx);
	await database
		.insertInto("userSettings")
		.values({
			userId,
			manualAcceptDebts: data.manualAcceptDebts,
		})
		.executeTakeFirstOrThrow();
};

type PeerData = {
	connectedUserId?: UserId;
	id?: PeerId;
	name?: string;
	publicName?: string;
};

export const insertPeer = async (
	ctx: TestContext,
	ownerUserId: UserId,
	data: PeerData = {},
) => {
	const database = assertDatabase(ctx);
	const { id, name } = await database
		.insertInto("peers")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerUserId,
			name: data.name || faker.person.firstName(),
			publicName: data.publicName,
			connectedUserId: data.connectedUserId,
		})
		.returning(["id", "name"])
		.executeTakeFirstOrThrow();
	return { id, name, publicName: data.publicName };
};

type UserData = {
	id?: UserId;
	email?: string;
	avatarUrl?: string | null;
	password?: string;
	confirmation?: {
		token?: string;
		timestamp?: Temporal.ZonedDateTime;
	};
	settings?: UserSettingsData;
	peer?: Pick<PeerData, "name">;
	role?: string;
	legacy?: { salt: string; hash: string };
};

// oxlint-disable-next-line complexity
export const insertUser = async (ctx: TestContext, data: UserData = {}) => {
	const database = assertDatabase(ctx);
	const authDatabase = assertAuthDatabase(ctx);
	const password = data.password || faker.internet.password();
	const { salt: passwordSalt, hash: passwordHash } = await generatePasswordData(
		{ getSalt: ctx.getTestSalt },
		password,
	);
	let id = data.id || ctx.getTestUuid();
	if (
		await authDatabase
			.selectFrom("auth.user")
			.select("id")
			.where("id", "=", id)
			.executeTakeFirst()
	) {
		id = ctx.getAuthTestUuid();
	}
	const email = (data.email || faker.internet.email()).toLowerCase();
	const avatarUrl =
		data.avatarUrl === null ? null : data.avatarUrl || faker.image.avatar();
	const confirmationToken = data.confirmation
		? data.confirmation.token || ctx.getTestUuid()
		: undefined;
	const confirmationTokenTimestamp = data.confirmation?.timestamp;
	await authDatabase
		.insertInto("auth.user")
		.values({
			id,
			name: email,
			email,
			emailVerified: !data.confirmation,
			image: avatarUrl,
			role: data.role ?? null,
			verificationEmailSentAt: confirmationTokenTimestamp
				? new Date(confirmationTokenTimestamp.toInstant().epochMilliseconds)
				: null,
			updatedAt: new Date(),
		})
		.executeTakeFirstOrThrow();
	await authDatabase
		.insertInto("auth.account")
		.values({
			id,
			accountId: id,
			providerId: "credential",
			userId: id,
			password: data.legacy ? null : await hashPassword(password),
			legacyPasswordSalt: data.legacy?.salt ?? passwordSalt,
			legacyPasswordHash: data.legacy?.hash ?? passwordHash,
			updatedAt: new Date(),
		})
		.executeTakeFirstOrThrow();
	await database
		.insertInto("users")
		.values({
			id,
			email,
			passwordHash,
			passwordSalt,
			confirmationToken: confirmationToken ?? null,
			confirmationTokenTimestamp: confirmationTokenTimestamp ?? null,
			avatarUrl,
			role: data.role ?? null,
		})
		.executeTakeFirstOrThrow();
	if (data.settings) {
		await insertUserSettings(ctx, id, data.settings);
	}
	const { id: peerId, name } = await database
		.insertInto("peers")
		.values({
			id: id as PeerId,
			ownerUserId: id,
			name: data.peer?.name || faker.person.firstName(),
			connectedUserId: id,
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

export const insertAccount = async (
	ctx: TestContext,
	data: UserData & { user?: Pick<PeerData, "name"> } = {},
) => insertUser(ctx, { ...data, peer: data.user ?? data.peer });

type ConnectedPeerData = { userId: UserId } & Omit<PeerData, "connectedUserId">;

export const insertConnectedPeers = async (
	ctx: TestContext,
	usersOrData: [UserId | ConnectedPeerData, UserId | ConnectedPeerData],
) => {
	const database = assertDatabase(ctx);
	const asTwoElementsTuple = asFixedSizeArray<2>();
	const dataWithIds = asTwoElementsTuple(
		usersOrData.map((userOrDatum, index) => {
			const connectedData = usersOrData[index === 0 ? 1 : 0];
			const sureData: Omit<ConnectedPeerData, "userId"> =
				typeof userOrDatum === "string" ? {} : userOrDatum;
			return {
				userId:
					typeof userOrDatum === "string" ? userOrDatum : userOrDatum.userId,
				connectedUserId:
					typeof connectedData === "string"
						? connectedData
						: connectedData.userId,
				data: sureData,
			};
		}),
	);
	const [firstResult, secondResult] = asTwoElementsTuple(
		await Promise.all(
			dataWithIds.map(({ userId, connectedUserId, data }) =>
				database
					.insertInto("peers")
					.values({
						id: data.id || ctx.getTestUuid(),
						ownerUserId: userId,
						name: data.name || faker.person.firstName(),
						publicName: data.publicName,
						connectedUserId,
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
			connectedUserId: firstDatum.connectedUserId,
		},
		{
			id: secondResult.id,
			name: secondResult.name,
			publicName: secondDatum.data.publicName,
			connectedUserId: secondDatum.connectedUserId,
		},
	]);
};

type SessionData = {
	id?: SessionId;
	expirationTimestamp?: Temporal.ZonedDateTime;
};

export const insertSession = async (
	ctx: TestContext,
	userId: UserId,
	data: SessionData = {},
) => {
	const authDatabase = assertAuthDatabase(ctx);
	const id = data.id || ctx.getAuthTestUuid();
	const expirationTimestamp =
		data.expirationTimestamp ||
		Temporal.Now.zonedDateTimeISO().add({ years: 1 });
	await authDatabase
		.insertInto("auth.session")
		.values({
			id,
			token: id,
			userId,
			expiresAt: new Date(expirationTimestamp.toInstant().epochMilliseconds),
			updatedAt: new Date(),
		})
		.executeTakeFirstOrThrow();
	return { id: signSessionCookie(id), expirationTimestamp };
};

type ResetPasswordIntentionData = {
	id?: SessionId;
	expiresTimestamp?: Temporal.ZonedDateTime;
	token?: string;
};

export const insertResetPasswordIntention = async (
	ctx: TestContext,
	userId: UserId,
	data: ResetPasswordIntentionData = {},
) => {
	const authDatabase = assertAuthDatabase(ctx);
	const token = data.token || ctx.getTestUuid();
	const expiresTimestamp =
		data.expiresTimestamp || Temporal.Now.zonedDateTimeISO().add({ years: 1 });
	await authDatabase
		.insertInto("auth.verification")
		.values({
			id: ctx.getAuthTestUuid(),
			identifier: `reset-password:${token}`,
			value: userId,
			expiresAt: new Date(expiresTimestamp.toInstant().epochMilliseconds),
			updatedAt: new Date(),
		})
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
	ownerUserId: UserId,
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
			ownerUserId,
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
	ownerUserId: UserId,
	debtId: DebtId,
) => {
	const database = assertDatabase(ctx);
	const debt = await database
		.selectFrom("debts")
		.where((eb) =>
			eb.and([
				eb("debts.ownerUserId", "=", ownerUserId),
				eb("debts.id", "=", debtId),
			]),
		)
		.select("debts.note")
		.limit(1)
		.executeTakeFirst();
	if (!debt) {
		throw new Error(
			`Expected to update debt id "${debtId}" of  user id "${ownerUserId}", but find none.`,
		);
	}
	const { updatedAt } = await database
		.updateTable("debts")
		.where((eb) =>
			eb.and([
				eb("debts.ownerUserId", "=", ownerUserId),
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
	[ownerUserId, peerId, data = {}]: [UserId, PeerId, DebtData?],
	[foreignOwnerUserId, foreignPeerId]: [UserId, PeerId],
	desync?: {
		fn?: (input: ReturnDebtData) => ReturnDebtData;
		ahead?: "our" | "their";
	},
) => {
	const originalDebt = await insertDebt(ctx, ownerUserId, peerId, data);
	const reverseDebtObject = desync?.fn ? desync.fn(originalDebt) : originalDebt;
	const reverseDebt = await insertDebt(ctx, foreignOwnerUserId, foreignPeerId, {
		id: reverseDebtObject.id,
		currencyCode: reverseDebtObject.currencyCode,
		amount: -reverseDebtObject.amount,
		timestamp: reverseDebtObject.timestamp,
		createdAt: reverseDebtObject.createdAt,
		note: reverseDebtObject.note,
		receiptId: reverseDebtObject.receiptId || undefined,
	});
	switch (desync?.ahead) {
		case "our": {
			const { updatedAt: selfUpdatedAt } = await updateDebt(
				ctx,
				ownerUserId,
				reverseDebt.id,
			);
			originalDebt.updatedAt = selfUpdatedAt;
			break;
		}
		case "their": {
			const { updatedAt: reverseUpdatedAt } = await updateDebt(
				ctx,
				foreignOwnerUserId,
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
	ownerUserId: UserId,
	data: ReceiptData = {},
) => {
	const database = assertDatabase(ctx);
	const { id, currencyCode, name, createdAt, issued } = await database
		.insertInto("receipts")
		.values({
			id: data.id || ctx.getTestUuid(),
			ownerUserId,
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
		ownerUserId,
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
	const { ownerUserId } = await database
		.selectFrom("receipts")
		.select("ownerUserId")
		.where("receipts.id", "=", receiptId)
		.executeTakeFirstOrThrow(
			() => new Error(`Expected to have receipt id ${receiptId} in tests`),
		);
	const { createdAt, role } = await database
		.insertInto("receiptParticipants")
		.values({
			receiptId,
			peerId,
			role: peerId === ownerUserId ? "owner" : (data.role ?? "viewer"),
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

type UserWithSessionData = {
	user?: UserData;
	session?: SessionData;
	peer?: Pick<PeerData, "name">;
};

export const insertUserWithSession = async (
	ctx: TestContext,
	data: UserWithSessionData = {},
) => {
	const {
		id: userId,
		peerId,
		name,
		...user
	} = await insertUser(ctx, data.user);
	const { id: sessionId, ...session } = await insertSession(
		ctx,
		userId,
		data.session,
	);
	return { userId, user, sessionId, session, peerId, name };
};
