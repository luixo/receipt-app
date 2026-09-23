import { z } from "zod";

import {
	createAuthorizationSession,
	getBotUserId,
} from "~web/handlers/auth/utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Link bot",
		description:
			"Verifies Telegram Mini App init data and links the resulting bot user id to a new session for the current account.",
	})
	.input(
		z.strictObject({
			initData: z.string(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const botUserId = getBotUserId(input.initData);
		await createAuthorizationSession(ctx, ctx.auth.accountId, botUserId);
	});
