import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import {
	emailSchema,
	passwordSchema,
	userNameSchema,
} from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { AccountsId, UsersId } from "next-app/db/models";
import {
	createAuthorizationSession,
	sendVerificationEmail,
} from "next-app/handlers/auth/utils";
import { unauthProcedure } from "next-app/handlers/trpc";
import { setAuthCookie } from "next-app/utils/auth-cookie";
import { generatePasswordData } from "next-app/utils/crypto";
import { isEmailServiceActive } from "next-app/utils/email";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			email: emailSchema,
			password: passwordSchema,
			name: userNameSchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
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
			const id: AccountsId = v4();
			const confirmationToken = v4();
			const emailServiceActive = isEmailServiceActive();
			const passwordData = generatePasswordData(input.password);
			if (emailServiceActive) {
				await sendVerificationEmail(input.email, confirmationToken);
			}
			await database
				.insertInto("accounts")
				.values({
					id,
					email,
					passwordHash: passwordData.hash,
					passwordSalt: passwordData.salt,
					confirmationToken: emailServiceActive ? confirmationToken : null,
					confirmationTokenTimestamp: emailServiceActive ? new Date() : null,
				})
				.execute();
			await database
				.insertInto("users")
				.values({
					// Typesystem doesn't know that we use account id as self user id
					id: id as UsersId,
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
				accountId: id,
			};
		}
	});
