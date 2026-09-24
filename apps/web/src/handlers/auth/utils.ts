import { TRPCError } from "@trpc/server";

import type { SessionId, UserId } from "~db/ids";
import { generateConfirmEmailEmail } from "~web/email/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getEmailClient } from "~web/providers/email";

// How long a session should last
const SESSION_EXPIRATION_DURATION = { days: 30 };
// How long until session expiration left before we auto-refresh it
export const SESSION_REFRESH_DURATION = Temporal.Duration.from(
	SESSION_EXPIRATION_DURATION,
).subtract({ days: 2 });

export const getExpirationDate = () =>
	Temporal.Now.zonedDateTimeISO().add(SESSION_EXPIRATION_DURATION);

export const createAuthorizationSession = async (
	ctx: UnauthorizedContext,
	userId: UserId,
) => {
	const uuid: SessionId = ctx.getUuid();
	const expirationDate = getExpirationDate();
	await ctx.database
		.insertInto("sessions")
		.values({
			userId,
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
	if (!ctx.emailOptions.getActive()) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Currently email resend is not supported",
		});
	}
	try {
		const data = await generateConfirmEmailEmail(token, ctx);
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
