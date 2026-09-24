import { z } from "zod";

import { peerNameSchema } from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Change  user name",
		description: "Updates the display name of the current  user's self-peer.",
	})
	.input(z.strictObject({ name: peerNameSchema }))
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		await database
			.updateTable("peers")
			.set({ name: input.name })
			.where("id", "=", ctx.auth.userId as PeerId)
			.executeTakeFirst();
	});
