import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { wait } from "~utils/promise";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Ping",
		description:
			"Test endpoint that waits a given timeout and echoes back a pong, optionally throwing an error.",
	})
	.input(
		z.object({
			timeout: z.number(),
			error: z.boolean().optional(),
		}),
	)
	.query(async ({ input: { timeout, error } }) => {
		await wait(timeout);
		if (error) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This is bad!",
			});
		}
		return "PONG";
	});
