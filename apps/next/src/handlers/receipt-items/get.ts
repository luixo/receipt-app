import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { Role } from "next-app/handlers/receipts/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const [receiptItems, receiptParticipants] = await Promise.all([
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
				.where("receiptId", "=", input.receiptId)
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
					sql<string | null>`case
						when "usersTheir"."ownerAccountId" = ${ctx.auth.accountId}
							then "usersTheir"."publicName"
						else
							null
						end`.as("publicName"),
					"usersMine.connectedAccountId",
					// only exists if foreign user is connected to an account
					// that local account owner also have
					"usersMine.id as localUserId",
					"role",
					"receiptParticipants.resolved",
					"added",
				])
				.orderBy("userId")
				.execute(),
		]);

		type OriginalReceiptItem = typeof receiptItems[number];
		type ReceiptItem = Omit<
			OriginalReceiptItem,
			"price" | "quantity" | "itemId" | "userId" | "part"
		> & {
			id: OriginalReceiptItem["itemId"];
			price: number;
			quantity: number;
			parts: {
				userId: NonNullable<OriginalReceiptItem["userId"]>;
				part: number;
				dirty?: boolean;
			}[];
			dirty?: boolean;
		};

		type OriginalReceiptParticipant = typeof receiptParticipants[number];
		type ReceiptParticipant = Omit<OriginalReceiptParticipant, "role"> & {
			role: Role;
			dirty?: boolean;
		};

		return {
			role:
				(receiptParticipants.find(
					(participant) => participant.connectedAccountId === ctx.auth.accountId
				)?.role as Role) ?? "owner",
			items: Object.values(
				receiptItems.reduce<Record<string, ReceiptItem>>(
					(acc, { price, quantity, itemId, userId, part, ...rest }) => {
						if (!acc[itemId]) {
							acc[itemId] = {
								id: itemId,
								price: Number(price),
								quantity: Number(quantity),
								parts: [],
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
					{}
				)
			),
			participants: receiptParticipants as ReceiptParticipant[],
		};
	},
});
