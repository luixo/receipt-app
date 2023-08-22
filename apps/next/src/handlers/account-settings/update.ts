import { z } from "zod";

import type { SimpleUpdateObject } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";

import { DEFAULT_ACCOUNT_SETTINGS } from "./get";

type SettingsUpdateObject = SimpleUpdateObject<"accountSettings">;

export const procedure = authProcedure
	.input(
		z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("autoAcceptDebts"),
				value: z.boolean(),
			}),
		]),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const updateObject: SettingsUpdateObject = {};
		switch (input.type) {
			case "autoAcceptDebts":
				updateObject.autoAcceptDebts = input.value;
		}
		const existingSettings = await database
			.selectFrom("accountSettings")
			.where("accountSettings.accountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (!existingSettings) {
			await database
				.insertInto("accountSettings")
				.values({
					accountId: ctx.auth.accountId,
					...DEFAULT_ACCOUNT_SETTINGS,
					...updateObject,
				})
				.executeTakeFirst();
		} else {
			await database
				.updateTable("accountSettings")
				.set(updateObject)
				.where("accountSettings.accountId", "=", ctx.auth.accountId)
				.executeTakeFirst();
		}
	});
