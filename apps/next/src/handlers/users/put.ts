import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		name: z
			.string()
			.min(VALIDATIONS_CONSTANTS.userName.min)
			.max(VALIDATIONS_CONSTANTS.userName.max),
		publicName: z
			.string()
			.min(VALIDATIONS_CONSTANTS.userName.min)
			.max(VALIDATIONS_CONSTANTS.userName.max)
			.nullish(),
	}),
	resolve: async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		await database
			.insertInto("users")
			.values({
				id,
				ownerAccountId: ctx.auth.accountId,
				name: input.name,
				publicName: input.publicName,
			})
			.executeTakeFirst();
		return id;
	},
});
