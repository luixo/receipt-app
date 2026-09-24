import type { Updateable } from "kysely";
import { z } from "zod";

import type { DB } from "~db/types.gen";
import { authProcedure } from "~web/handlers/trpc";

import { DEFAULT_ACCOUNT_SETTINGS } from "./get";

type SettingsUpdateObject = Updateable<DB["userSettings"]>;

export const procedure = authProcedure
	.meta({
		title: "Update  user settings",
		description: "Updates a single  user setting for the current  user.",
	})
	.input(
		z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("manualAcceptDebts"),
				value: z.boolean(),
			}),
		]),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const updateObject: SettingsUpdateObject = {};
		switch (input.type) {
			// We want this to blow up in case we add more cases
			// oxlint-disable-next-line typescript/no-unnecessary-condition
			case "manualAcceptDebts":
				updateObject.manualAcceptDebts = input.value;
		}
		const existingSettings = await database
			.selectFrom("userSettings")
			.where("userSettings.userId", "=", ctx.auth.userId)
			.limit(1)
			.executeTakeFirst();
		// This reads better without ternary
		// oxlint-disable-next-line unicorn/prefer-ternary
		if (existingSettings) {
			await database
				.updateTable("userSettings")
				.set(updateObject)
				.where("userSettings.userId", "=", ctx.auth.userId)
				.executeTakeFirst();
		} else {
			await database
				.insertInto("userSettings")
				.values({
					userId: ctx.auth.userId,
					...DEFAULT_ACCOUNT_SETTINGS,
					...updateObject,
				})
				.executeTakeFirst();
		}
	});
