import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import type { Database } from "next-app/db";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";
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
) =>
	database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.select([
			"receiptParticipants.userId",
			sql.id("receiptParticipants", "role").$castTo<Role>().as("role"),
			"receiptParticipants.resolved",
			"receiptParticipants.added",
		])
		.orderBy("userId")
		.execute();

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
			getReceiptParticipants(database, input.receiptId),
		]);

		return {
			items,
			participants,
		};
	});
