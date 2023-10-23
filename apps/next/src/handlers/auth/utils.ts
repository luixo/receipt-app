import { TRPCError } from "@trpc/server";

import { DAY } from "app/utils/time";
import type { Database } from "next-app/db";
import type { AccountsId, SessionsSessionId } from "next-app/db/models";
import { generateConfirmEmailEmail } from "next-app/email/utils";
import type { UnauthorizedContext } from "next-app/handlers/context";
import type { EmailOptions } from "next-app/providers/email";
import { getEmailClient } from "next-app/providers/email";

// How long a session should last
const SESSION_EXPIRATION_DURATION = 30 * DAY;
// How long before the session expires should we update the expiration date
const SESSION_SHOULD_UPDATE_DURATION = 28 * DAY;

const getExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_DURATION);
export const shouldUpdateExpirationDate = (expirationTimestamp: Date) =>
	expirationTimestamp.valueOf() - Date.now() < SESSION_SHOULD_UPDATE_DURATION;

export const createAuthorizationSession = async (
	ctx: UnauthorizedContext,
	accountId: AccountsId,
) => {
	const uuid: SessionsSessionId = ctx.getUuid();
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

export const updateAuthorizationSession = async (
	database: Database,
	authToken: SessionsSessionId,
) => {
	database
		.updateTable("sessions")
		.set({ expirationTimestamp: getExpirationDate() })
		.where("sessionId", "=", authToken)
		.executeTakeFirst();
};

export const sendVerificationEmail = async (
	emailOptions: EmailOptions,
	email: string,
	token: string,
) => {
	if (!emailOptions.active) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Currently email resend is not supported",
		});
	}
	try {
		await getEmailClient(emailOptions).send({
			address: email,
			subject: "Confirm email in Receipt App",
			body: generateConfirmEmailEmail(emailOptions, token),
		});
	} catch (e) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Something went wrong: ${
				e instanceof Error ? e.message : String(e)
			}`,
		});
	}
};
