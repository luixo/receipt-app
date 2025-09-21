import { TRPCError } from "@trpc/server";

import type { AccountId, SessionId } from "~db/ids";
import { add, getNow, parseDuration, serializeDuration } from "~utils/date";
import { generateConfirmEmailEmail } from "~web/email/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getEmailClient } from "~web/providers/email";

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
) => {
	const uuid: SessionId = ctx.getUuid();
	const expirationDate = getExpirationDate();
	await ctx.database
		.insertInto("sessions")
		.values({
			accountId,
			sessionId: uuid,
			expirationTimestamp: expirationDate,
		})
		.executeTakeFirst();
	return {
		authToken: uuid,
		expirationDate,
	};
};

export const sendVerificationEmail = async (
	ctx: UnauthorizedContext,
	email: string,
	token: string,
) => {
	if (!ctx.emailOptions.active) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Currently email resend is not supported",
		});
	}
	try {
		await getEmailClient(ctx).send({
			address: email,
			subject: "Confirm email in Receipt App",
			body: generateConfirmEmailEmail(ctx, token),
		});
	} catch (e) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Something went wrong: ${
				/* c8 ignore next */
				e instanceof Error ? e.message : String(e)
			}`,
		});
	}
};
