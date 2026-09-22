import { TRPCError } from "@trpc/server";
import type { Updateable } from "kysely";
import { z } from "zod";

import { peerNameSchema } from "~app/utils/validation";
import type { DB } from "~db/types.gen";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Update peer",
		description:
			"Updates the name or public name of a peer owned by the current account.",
	})
	.input(
		z.strictObject({
			id: peerIdSchema,
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("name"),
					name: peerNameSchema,
				}),
				z.strictObject({
					type: z.literal("publicName"),
					publicName: peerNameSchema.optional(),
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
							'Updating self peer property expect but "name" is not allowed.',
					});
			}
		}
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
		let setObject: Updateable<DB["peers"]> = {};
		switch (input.update.type) {
			case "name":
				setObject = { name: input.update.name };
				break;
			case "publicName":
				setObject = { publicName: input.update.publicName || null };
				break;
		}
		await database
			.updateTable("peers")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
