import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { verifyTelegramInitData } from "~utils/server/crypto";
import { createAuthorizationSession } from "~web/handlers/auth/utils";
import { authProcedure } from "~web/handlers/trpc";
import { env } from "~web/utils/env";

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
		if (!env.TELEGRAM_BOT_TOKEN) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Bot linking is not configured.",
			});
		}
		const verified = verifyTelegramInitData(
			input.initData,
			env.TELEGRAM_BOT_TOKEN,
		);
		if (!verified) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid Telegram data.",
			});
		}
		await createAuthorizationSession(
			ctx,
			ctx.auth.accountId,
			`tg:${verified.id}`,
		);
	});
