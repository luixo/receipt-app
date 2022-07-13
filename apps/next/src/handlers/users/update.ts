import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { ReceiptsDatabase, getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		id: z.string().uuid().refine<UsersId>(flavored),
		update: z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("name"),
				name: z
					.string()
					.min(VALIDATIONS_CONSTANTS.userName.min)
					.max(VALIDATIONS_CONSTANTS.userName.max),
			}),
			z.strictObject({
				type: z.literal("publicName"),
				publicName: z
					.string()
					.min(VALIDATIONS_CONSTANTS.userName.min)
					.max(VALIDATIONS_CONSTANTS.userName.max),
			}),
		]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
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
		let setObject: MutationObject<ReceiptsDatabase, "users", "users"> = {};
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
	},
});
