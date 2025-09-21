import { TRPCError } from "@trpc/server";
import type { Updateable } from "kysely";
import { z } from "zod";

import { userNameSchema } from "~app/utils/validation";
import type { DB } from "~db/types.gen";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("name"),
					name: userNameSchema,
				}),
				z.strictObject({
					type: z.literal("publicName"),
					publicName: userNameSchema.optional(),
				}),
			]),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		if (input.id === ctx.auth.accountId) {
			switch (input.update.type) {
				case "name":
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							'Please use "account.changeName" handler to update your own name.',
					});
				default:
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							'Updating self user property expect but "name" is not allowed.',
					});
			}
		}
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select("ownerAccountId")
			.where("id", "=", input.id)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		let setObject: Updateable<DB["users"]> = {};
		switch (input.update.type) {
			case "name":
				setObject = { name: input.update.name };
				break;
			case "publicName":
				setObject = { publicName: input.update.publicName || null };
				break;
		}
		await database
			.updateTable("users")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
