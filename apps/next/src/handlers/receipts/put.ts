import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		name: z.string().min(2).max(255),
	}),
	resolve: async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		await database
			.insertInto("receipts")
			.values({
				id,
				name: input.name,
				currency: "USD",
				created: new Date(),
				issued: new Date(),
				ownerAccountId: ctx.auth.accountId,
			})
			.executeTakeFirst();
		return id;
	},
});
