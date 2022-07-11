import { DAY } from "app/utils/time";
import { v4 } from "uuid";

import { Database } from "../../db";

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
