import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { passwordSchema, userNameSchema } from "~app/utils/validation";
import type { AccountsId, UsersId } from "~web/db/models";
import {
	createAuthorizationSession,
	sendVerificationEmail,
} from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";
import { generatePasswordData } from "~web/utils/crypto";
import { setAuthCookie } from "~web/utils/server-cookies";

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
			throw new TRPCError({
				code: "CONFLICT",
				message: `Email "${input.email.original}" already exists.`,
			});
		}
		const id: AccountsId = ctx.getUuid();
		const confirmationToken = ctx.getUuid();
		const emailServiceActive = ctx.emailOptions.active;
		const passwordData = generatePasswordData(ctx, input.password);
		if (emailServiceActive) {
			await sendVerificationEmail(
				ctx,
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
