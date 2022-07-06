import * as trpc from "@trpc/server";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { v4 } from "uuid";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AuthorizedContext } from "../context";
import { currency } from "../zod";

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
