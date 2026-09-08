import { z } from "zod";

import { getNow } from "~utils/date";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Check bot authorization",
		description:
			"Returns whether a given bot user id currently has a valid, non-expired session.",
	})
	.input(
		z.strictObject({
			botUserId: z.string(),
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const session = await database
			.selectFrom("sessions")
			.where((eb) =>
				eb("botUserId", "=", input.botUserId).and(
					"expirationTimestamp",
					">",
					getNow.zonedDateTime(),
				),
			)
			.select("sessionId")
			.limit(1)
			.executeTakeFirst();
		return {
			authorized: Boolean(session),
		};
	});
