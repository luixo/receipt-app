import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { emailSchema, userNameSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { addConnectionIntention } from "next-app/handlers/account-connection-intentions/utils";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().mutation("add", {
	input: z.strictObject({
		name: userNameSchema,
		publicName: userNameSchema.optional(),
		email: emailSchema.optional(),
	}),
	resolve: async ({ input, ctx }) => {
		const id: UsersId = v4();
		const database = getDatabase(ctx);
		return database.transaction().execute(async () => {
			await database
				.insertInto("users")
				.values({
					id,
					ownerAccountId: ctx.auth.accountId,
					name: input.name,
					publicName: input.publicName,
				})
				.executeTakeFirst();
			if (input.email) {
				const connection = await addConnectionIntention(
					database,
					ctx.auth.accountId,
					{ name: input.name },
					input.email,
					id
				);
				return { id, connection };
			}
			return { id };
		});
	},
});
