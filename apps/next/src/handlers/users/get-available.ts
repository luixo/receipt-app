import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getReceiptById, getAccessRole } from "../receipts/utils";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().query("get-available", {
	input: z.strictObject({
		cursor: z.number().nullish(),
		limit: z.number(),
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"id",
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole !== "owner") {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to modify receipt ${input.receiptId}.`,
			});
		}
		const users = await database
			.selectFrom("users")
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.where("users.id", "not in", (eb) =>
				eb
					.selectFrom("receiptParticipants")
					.innerJoin("users", (jb) =>
						jb.onRef("users.id", "=", "receiptParticipants.userId")
					)
					.where("receiptParticipants.receiptId", "=", input.receiptId)
					.select("users.id")
			)
			.select(["id", "name", "publicName", "connectedAccountId"])
			.orderBy("id")
			.offset(input.cursor || 0)
			.limit(input.limit)
			.execute();

		return users;
	},
});
