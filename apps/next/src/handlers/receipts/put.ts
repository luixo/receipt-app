import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { currency } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		name: z
			.string()
			.min(VALIDATIONS_CONSTANTS.receiptName.min)
			.max(VALIDATIONS_CONSTANTS.receiptName.max),
		currency,
	}),
	resolve: async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		await database
			.insertInto("receipts")
			.values({
				id,
				name: input.name,
				currency: input.currency,
				created: new Date(),
				issued: new Date(),
				ownerAccountId: ctx.auth.accountId,
			})
			.executeTakeFirst();
		return id;
	},
});
