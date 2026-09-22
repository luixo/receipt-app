import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove peer",
		description: "Removes a peer by id owned by the current account.",
	})
	.input(
		z.strictObject({
			id: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const peer = await database
			.selectFrom("peers")
			.select("ownerAccountId")
			.where("id", "=", input.id)
			.limit(1)
			.executeTakeFirst();
		if (!peer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No peer found by id "${input.id}".`,
			});
		}
		if (peer.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		await database
			.deleteFrom("peers")
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
