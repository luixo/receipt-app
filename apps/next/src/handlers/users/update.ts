import * as trpc from "@trpc/server";
import { z } from "zod";

import { userNameSchema } from "app/utils/validation";
import { SimpleUpdateObject } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import { userIdSchema } from "next-app/handlers/validation";

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
					publicName: userNameSchema.nullable(),
				}),
			]),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		if (input.id === ctx.auth.accountId) {
			if (input.update.type === "name") {
				throw new trpc.TRPCError({
					code: "BAD_REQUEST",
					message:
						'Please user "account.changeName" handler to update your own name',
				});
			} else {
				throw new trpc.TRPCError({
					code: "BAD_REQUEST",
					message:
						'Updating self user property expect but "name" is not allowed',
				});
			}
		}
		const { database } = ctx;
		const user = await getUserById(database, input.id, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No user found by id ${input.id}`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `User ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}
		let setObject: SimpleUpdateObject<"users"> = {};
		switch (input.update.type) {
			case "name":
				setObject = { name: input.update.name };
				break;
			case "publicName":
				setObject = { publicName: input.update.publicName };
				break;
		}
		await database
			.updateTable("users")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
