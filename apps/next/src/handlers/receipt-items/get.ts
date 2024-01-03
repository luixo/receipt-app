import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import type { Database } from "next-app/db";
import type {
	AccountsId,
	ReceiptItemsId,
	ReceiptsId,
	UsersId,
} from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";
import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

const getReceiptItems = async (database: Database, receiptId: ReceiptsId) => {
	const items = await database
		.selectFrom("receiptItems")
		.leftJoin("itemParticipants", (jb) =>
			jb.onRef("receiptItems.id", "=", "itemParticipants.itemId"),
		)
		.select([
			"receiptItems.id as itemId",
			"receiptItems.name",
			"receiptItems.price",
			"receiptItems.locked",
			"receiptItems.quantity",
			"receiptItems.created",
			"itemParticipants.userId",
			"itemParticipants.part",
		])
		.where("receiptItems.receiptId", "=", receiptId)
		.orderBy(["receiptItems.created desc", "receiptItems.id"])
		.execute();
	return Object.values(
		items.reduce(
			(acc, { price, quantity, itemId, userId, part, locked, ...rest }) => {
				if (!acc[itemId]) {
					acc[itemId] = {
						id: itemId,
						price: Number(price),
						quantity: Number(quantity),
						parts: [],
						locked: Boolean(locked),
						...rest,
					};
				}
				if (userId) {
					acc[itemId]!.parts.push({
						userId,
						part: Number(part),
					});
				}
				return acc;
			},
			{} as Record<ReceiptItemsId, ReceiptItem>,
		),
	).map(({ parts, ...receiptItem }) => ({
		...receiptItem,
		parts: parts.sort((a, b) => a.userId.localeCompare(b.userId)),
	}));
};

type RawReceiptItem = {
	itemId: ReceiptItemsId;
	name: string;
	price: string;
	locked: boolean;
	quantity: string;
	userId: UsersId | null;
	part: string | null;
	created: Date;
};

type ReceiptItem = Omit<
	RawReceiptItem,
	"price" | "quantity" | "itemId" | "userId" | "part"
> & {
	id: ReceiptItemsId;
	price: number;
	quantity: number;
	parts: {
		userId: UsersId;
		part: number;
	}[];
};

const getReceiptParticipants = async (
	database: Database,
	receiptId: ReceiptsId,
	ownerAccountId: AccountsId,
) => {
	const participants = await database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.innerJoin("users as usersTheir", (jb) =>
			jb.onRef("usersTheir.id", "=", "receiptParticipants.userId"),
		)
		.leftJoin("users as usersMine", (jb) =>
			jb
				.onRef(
					"usersMine.connectedAccountId",
					"=",
					"usersTheir.connectedAccountId",
				)
				.on("usersMine.ownerAccountId", "=", ownerAccountId),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("usersMine.connectedAccountId", "=", "accounts.id"),
		)
		.select([
			"userId as remoteUserId",
			"usersMine.publicName",
			"usersMine.name",
			"usersTheir.publicName as theirPublicName",
			"usersTheir.name as theirName",
			"accounts.id as accountId",
			"accounts.email",
			"accounts.avatarUrl",
			sql`role`.$castTo<Role>().as("role"),
			"receiptParticipants.resolved",
			"added",
		])
		.orderBy("userId")
		.execute();
	return participants.map(
		({
			name,
			theirName,
			theirPublicName,
			accountId,
			email,
			avatarUrl,
			...participant
		}) => ({
			...participant,
			name: name ?? theirPublicName ?? theirName,
			connectedAccount:
				accountId === null || email === null
					? undefined
					: {
							id: accountId,
							email,
							avatarUrl: avatarUrl || undefined,
					  },
		}),
	);
};

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.where("receipts.id", "=", input.receiptId)
			.select(["receipts.ownerAccountId", "receipts.id"])
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" is not found.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Account "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
			});
		}
		const [items, participants] = await Promise.all([
			getReceiptItems(database, input.receiptId),
			getReceiptParticipants(database, input.receiptId, ctx.auth.accountId),
		]);

		return {
			role:
				participants.find(
					(participant) =>
						participant.connectedAccount?.id === ctx.auth.accountId,
				)?.role ?? "owner",
			items,
			participants,
		};
	});
