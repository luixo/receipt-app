import * as trpc from "@trpc/server";
import { v4 } from "uuid";

import { DAY } from "app/utils/time";
import type { Database } from "next-app/db";
import type { AccountsId, SessionsSessionId } from "next-app/db/models";
import { generateConfirmEmailEmail } from "next-app/email/utils";
import { getEmailClient } from "next-app/utils/email";

// How long a session should last
const SESSION_EXPIRATION_DURATION = 30 * DAY;
// How long before the session expires should we update the expiration date
const SESSION_SHOULD_UPDATE_DURATION = 28 * DAY;

const getExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_DURATION);
export const shouldUpdateExpirationDate = (expirationTimestamp: Date) =>
	expirationTimestamp.valueOf() - Date.now() < SESSION_SHOULD_UPDATE_DURATION;

export const createAuthorizationSession = async (
	database: Database,
	accountId: AccountsId,
) => {
	const uuid = v4();
	const expirationDate = getExpirationDate();
	await database
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

export const removeAuthorizationSession = async (
	database: Database,
	sessionId: SessionsSessionId,
) => {
	await database
		.deleteFrom("sessions")
		.where("sessionId", "=", sessionId)
		.executeTakeFirst();
};

export const sendVerificationEmail = async (email: string, token: string) => {
	try {
		await getEmailClient().send({
			address: email,
			subject: "Confirm email in Receipt App",
			body: generateConfirmEmailEmail(token),
		});
	} catch (e) {
		throw new trpc.TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Something went wrong: ${String(e)}`,
		});
	}
};
