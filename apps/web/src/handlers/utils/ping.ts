import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.input(
		z.object({
			timeout: z.number(),
			error: z.boolean().optional(),
		}),
	)
	.query(async ({ input: { timeout, error } }) => {
		await new Promise((resolve) => {
			setTimeout(resolve, timeout);
		});
		if (error) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This is bad!",
			});
		}
		return "PONG";
	});
