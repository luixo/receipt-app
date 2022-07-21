import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { ReceiptItemsId, UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { Role } from "next-app/handlers/receipts/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

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
		receiptId: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const [rows, receiptParticipants] = await Promise.all([
			database
				.selectFrom("receiptItems")
				.leftJoin("itemParticipants", (jb) =>
					jb.onRef("receiptItems.id", "=", "itemParticipants.itemId")
				)
				.select([
					"receiptItems.id as itemId",
					"receiptItems.name",
					"receiptItems.price",
					"receiptItems.locked",
					"receiptItems.quantity",
					"itemParticipants.userId",
					"itemParticipants.part",
				])
				.where("receiptItems.receiptId", "=", input.receiptId)
				.orderBy("receiptItems.id")
				.execute(),
			database
				.selectFrom("receiptParticipants")
				.innerJoin("users as usersTheir", (jb) =>
					jb.onRef("usersTheir.id", "=", "receiptParticipants.userId")
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
					sql<string>`case
						when "usersTheir"."ownerAccountId" = ${ctx.auth.accountId}
							then "usersTheir".name
						when "usersTheir"."publicName" is not null
							then "usersTheir"."publicName"
						else
							"usersTheir".name
						end`.as("name"),
					// only exists if foreign user is connected to an account
					// that local account owner also have
					"usersMine.id as localUserId",
					"role",
					"receiptParticipants.resolved",
					"added",
				])
				.where("receiptId", "=", input.receiptId)
				.orderBy("userId")
				.execute(),
		]);

		type OriginalReceiptParticipant = typeof receiptParticipants[number];
		type ReceiptParticipant = Omit<OriginalReceiptParticipant, "role"> & {
			role: Role;
			dirty?: boolean;
		};

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
			participants: receiptParticipants as ReceiptParticipant[],
		};
	},
});
