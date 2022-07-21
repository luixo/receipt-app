import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import {
	accountNameSchema,
	emailSchema,
	passwordSchema,
} from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { createAuthorizationSession } from "next-app/handlers/auth/utils";
import { UnauthorizedContext } from "next-app/handlers/context";
import { setAuthCookie } from "next-app/utils/auth-cookie";
import { generatePasswordData } from "next-app/utils/crypto";

export const router = trpc.router<UnauthorizedContext>().mutation("register", {
	input: z.strictObject({
		email: emailSchema,
		password: passwordSchema,
		name: accountNameSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const email = input.email.toLowerCase();
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.select([])
			.where("email", "=", email)
			.executeTakeFirst();
		if (account) {
			ctx.logger.debug(
				`Registration of account "${email}" failed: email already exists.`
			);
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: "Email already exist",
			});
		} else {
			const id = v4();
			const passwordData = generatePasswordData(input.password);
			await database
				.insertInto("accounts")
				.values({
					id,
					email,
					passwordHash: passwordData.hash,
					passwordSalt: passwordData.salt,
				})
				.execute();
			await database
				.insertInto("users")
				.values({
					id,
					name: input.name,
					ownerAccountId: id,
					connectedAccountId: id,
					exposeReceipts: true,
					acceptReceipts: true,
				})
				.execute();
			const { authToken, expirationDate } = await createAuthorizationSession(
				database,
				id
			);
			ctx.logger.debug(`Registration of account "${email}" succeed.`);
			setAuthCookie(ctx.res, authToken, expirationDate);
			return {
				expirationTimestamp: expirationDate.valueOf(),
				accountId: id,
				email,
			};
		}
	},
});
