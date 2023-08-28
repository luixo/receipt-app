import * as trpc from "@trpc/server";
import { z } from "zod";

import { passwordSchema, userNameSchema } from "app/utils/validation";
import type { AccountsId, UsersId } from "next-app/db/models";
import {
	createAuthorizationSession,
	sendVerificationEmail,
} from "next-app/handlers/auth/utils";
import { unauthProcedure } from "next-app/handlers/trpc";
import { emailSchema } from "next-app/handlers/validation";
import { setAuthCookie } from "next-app/utils/auth-cookie";
import { generatePasswordData } from "next-app/utils/crypto";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			email: emailSchema,
			password: passwordSchema,
			name: userNameSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select([])
			.where("email", "=", input.email.lowercase)
			.executeTakeFirst();
		if (account) {
			ctx.logger.debug(
				`Registration of account "${input.email.original}" failed: email already exists.`,
			);
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: "Email already exist",
			});
		}
		const id: AccountsId = ctx.getUuid();
		const confirmationToken = ctx.getUuid();
		const emailServiceActive = ctx.emailOptions.active;
		const passwordData = generatePasswordData(ctx, input.password);
		if (emailServiceActive) {
			await sendVerificationEmail(
				ctx.emailOptions,
				input.email.lowercase,
				confirmationToken,
			);
		}
		await database
			.insertInto("accounts")
			.values({
				id,
				email: input.email.lowercase,
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
			ctx,
			id,
		);
		ctx.logger.debug(
			`Registration of account "${input.email.original}" succeed.`,
		);
		setAuthCookie(ctx.res, authToken, expirationDate);
		return {
			account: { id },
		};
	});
