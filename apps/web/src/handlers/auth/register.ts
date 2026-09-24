import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import { passwordSchema, peerNameSchema } from "~app/utils/validation";
import type { PeerId, UserId } from "~db/ids";
import { generatePasswordData } from "~utils/server/crypto";
import {
	createAuthorizationSession,
	sendVerificationEmail,
} from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";
import { setCookie } from "~web/utils/cookies";

export const procedure = unauthProcedure
	.meta({
		title: "Register account",
		description:
			"Creates a new account and its self-peer, sends a verification email if enabled, and starts a new session.",
	})
	.input(
		z.strictObject({
			email: emailSchema,
			password: passwordSchema,
			name: peerNameSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("users")
			.select([])
			.where("email", "=", input.email.lowercase)
			.limit(1)
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
		const id: UserId = ctx.getUuid();
		const confirmationToken = ctx.getUuid();
		const emailServiceActive = ctx.emailOptions.getActive();
		const passwordData = await generatePasswordData(ctx, input.password);
		if (emailServiceActive) {
			await sendVerificationEmail(
				ctx,
				input.email.lowercase,
				confirmationToken,
			);
		}
		await database
			.insertInto("users")
			.values({
				id,
				email: input.email.lowercase,
				passwordHash: passwordData.hash,
				passwordSalt: passwordData.salt,
				confirmationToken: emailServiceActive ? confirmationToken : null,
				confirmationTokenTimestamp: emailServiceActive
					? Temporal.Now.zonedDateTimeISO()
					: null,
			})
			.execute();
		await database
			.insertInto("peers")
			.values({
				// Typesystem doesn't know that we use account id as self peer id
				id: id as PeerId,
				name: input.name,
				ownerUserId: id,
				connectedUserId: id,
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
		setCookie(ctx, AUTH_COOKIE, authToken, { expires: expirationDate });
		return {
			user: { id, verified: !emailServiceActive },
		};
	});
