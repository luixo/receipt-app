import { TRPCError } from "@trpc/server";

import type { AccountId, SessionId } from "~db/ids";
import { add, getNow, parseDuration, serializeDuration } from "~utils/date";
import { verifyTelegramInitData } from "~utils/server/crypto";
import { generateConfirmEmailEmail } from "~web/email/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getEmailClient } from "~web/providers/email";
import { env } from "~web/utils/env";

// How long a session should last
const SESSION_EXPIRATION_DURATION = { days: 30 };
// How long until session expiration left before we auto-refresh it
export const SESSION_REFRESH_DURATION = parseDuration(
	serializeDuration(SESSION_EXPIRATION_DURATION) -
		serializeDuration({ days: 2 }),
);

export const getExpirationDate = () =>
	add.zonedDateTime(getNow.zonedDateTime(), SESSION_EXPIRATION_DURATION);

export const createAuthorizationSession = async (
	ctx: UnauthorizedContext,
	accountId: AccountId,
	botUserId?: string,
) => {
	const uuid: SessionId = ctx.getUuid();
	const expirationDate = getExpirationDate();
	await ctx.database
		.insertInto("sessions")
		.values({
			accountId,
			sessionId: uuid,
			expirationTimestamp: expirationDate,
			botUserId,
		})
		.executeTakeFirst();
	return {
		authToken: uuid,
		expirationDate,
	};
};

// Verifies a Telegram Mini App init data payload and returns the
// platform-prefixed bot user id to stamp onto a session - shared by
// auth.login (fresh login from the /login?bot=telegram page) and
// sessions.linkBot (linking from an already-authenticated session).
export const getBotUserId = (initData: string): string => {
	if (!env.TELEGRAM_BOT_TOKEN) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Bot linking is not configured.",
		});
	}
	const verified = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
	if (!verified) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid Telegram data.",
		});
	}
	return `tg:${verified.id}`;
};

export const sendVerificationEmail = async (
	ctx: UnauthorizedContext,
	email: string,
	token: string,
) => {
	if (!ctx.emailOptions.getActive()) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Currently email resend is not supported",
		});
	}
	try {
		const data = await generateConfirmEmailEmail(ctx, token);
		await getEmailClient(ctx).send({ address: email, ...data });
	} catch (error) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Something went wrong: ${
				/* c8 ignore next */
				error instanceof Error ? error.message : String(error)
			}`,
		});
	}
};
