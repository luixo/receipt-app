import * as trpc from "@trpc/server";
import { v4 } from "uuid";

import { DAY } from "app/utils/time";
import { Database } from "next-app/db";
import { generateConfirmEmailEmail } from "next-app/email/utils";
import { getEmailClient } from "next-app/utils/email";

export const createAuthorizationSession = async (
	database: Database,
	accountId: string
) => {
	const uuid = v4();
	const expirationDate = new Date(Date.now() + 7 * DAY);
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

export const removeAuthorizationSession = async (
	database: Database,
	sessionId: string
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
