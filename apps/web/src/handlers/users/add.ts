import { z } from "zod";

import { userNameSchema } from "~app/utils/validation";
import type { UsersId } from "~db/models";
import { addConnectionIntention } from "~web/handlers/account-connection-intentions/utils";
import { authProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			name: userNameSchema,
			publicName: userNameSchema.optional(),
			email: emailSchema.optional(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const id: UsersId = ctx.getUuid();
		const { database } = ctx;
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
					id,
				);
				return { id, connection };
			}
			return { id };
		});
	});
