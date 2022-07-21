import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getAccessRole, Role } from "next-app/handlers/receipts/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		id: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await database
			.selectFrom("receipts")
			.leftJoin("receiptItems", (jb) =>
				jb.onRef("receiptItems.receiptId", "=", "receipts.id")
			)
			.select([
				"receipts.id",
				"receipts.name",
				"currency",
				sql<string>`coalesce(sum("receiptItems".price * "receiptItems".quantity), 0)`.as(
					"sum"
				),
				"ownerAccountId",
				"resolved",
				"issued",
			])
			.where("receipts.id", "=", input.id)
			.groupBy("receipts.id")
			.executeTakeFirst();
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `No receipt ${input.id} found`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole) {
			return {
				...receipt,
				role: accessRole,
			} as typeof receipt & { role: Role; dirty?: boolean };
		}
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
		});
	},
});
