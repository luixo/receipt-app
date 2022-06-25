import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptItemsId, ReceiptsId, UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

type ReceiptItem = {
	id: ReceiptItemsId;
	name: string;
	price: number;
	quantity: number;
	locked: boolean;
	parts: { userId: UsersId; part: number; dirty?: boolean }[];
	dirty?: boolean;
};

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const [rows, receiptParticipants] = await Promise.all([
			database
				.selectFrom("receipt_items")
				.leftJoin("item_participants", (jb) =>
					jb.onRef("receipt_items.id", "=", "item_participants.itemId")
				)
				.select([
					"receipt_items.id as itemId",
					"receipt_items.name",
					"receipt_items.price",
					"receipt_items.locked",
					"receipt_items.quantity",
					"item_participants.userId",
					"item_participants.part",
				])
				.where("receipt_items.receiptId", "=", input.receiptId)
				.orderBy("receipt_items.id")
				.execute(),
			database
				.selectFrom("receipt_participants")
				.innerJoin("users as usersTheir", (jb) =>
					jb.onRef("usersTheir.id", "=", "receipt_participants.userId")
				)
				.leftJoin("users as usersMine", (jb) =>
					jb
						.onRef(
							"usersMine.connectedAccountId",
							"=",
							"usersTheir.connectedAccountId"
						)
						.on("usersMine.ownerAccountId", "=", ctx.auth.accountId)
				)
				.select([
					"userId",
					sql<string>`case when "usersTheir"."ownerAccountId" = ${ctx.auth.accountId} then "usersTheir".name when "usersMine".name is not null then "usersMine".name else "usersTheir"."publicName" end`.as(
						"name"
					),
					// only exists if foreign user is connected to an account
					// that local account owner also have
					"usersMine.id as localUserId",
					"role",
					"receipt_participants.resolved",
				])
				.where("receiptId", "=", input.receiptId)
				.orderBy("userId")
				.execute(),
		]);

		return {
			items: Object.values(
				rows.reduce<Record<string, ReceiptItem>>((acc, row) => {
					if (!acc[row.itemId]) {
						acc[row.itemId] = {
							id: row.itemId,
							name: row.name,
							price: Number(row.price),
							quantity: Number(row.quantity),
							locked: Boolean(row.locked),
							parts: [],
						};
					}
					if (row.userId) {
						acc[row.itemId]!.parts.push({
							userId: row.userId,
							part: Number(row.part),
						});
					}
					return acc;
				}, {})
			),
			participants: receiptParticipants.map((participant) => ({
				...participant,
				role: participant.role as "owner" | "editor" | "viewer",
				dirty: undefined as boolean | undefined,
			})),
		};
	},
});
