import { TRPCError } from "@trpc/server";
import type { z } from "zod";

import { ACCOUNT_CONNECTIONS_INTENTIONS } from "~db/consts";
import type { AccountsId, UsersId } from "~db/models";
import type { Database } from "~db/types";
import type { emailSchema } from "~web/handlers/validation";

export const addConnectionIntention = async (
	database: Database,
	fromAccountId: AccountsId,
	user: { name: string },
	toEmail: z.infer<typeof emailSchema>,
	asUserId: UsersId,
) => {
	const targetAccount = await database
		.selectFrom("accounts")
		.select(["id", "avatarUrl"])
		.where("email", "=", toEmail.lowercase)
		.executeTakeFirst();
	if (!targetAccount) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Account with email "${toEmail.original}" does not exist.`,
		});
	}
	const connectedUser = await database
		.selectFrom("accounts")
		.where("accounts.email", "=", toEmail.lowercase)
		.innerJoin("users", (qb) =>
			qb
				.onRef("users.connectedAccountId", "=", "accounts.id")
				.on("users.ownerAccountId", "=", fromAccountId),
		)
		.select("users.name")
		.executeTakeFirst();
	if (connectedUser) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Account with email "${toEmail.original}" is already connected to user "${connectedUser.name}".`,
		});
	}
	const viceVersaIntention = await database
		.selectFrom("accountConnectionsIntentions")
		.select("userId")
		.where((eb) =>
			eb.and({
				accountId: targetAccount.id,
				targetAccountId: fromAccountId,
			}),
		)
		.executeTakeFirst();
	if (viceVersaIntention) {
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: fromAccountId })
				.where((eb) =>
					eb.and({
						ownerAccountId: targetAccount.id,
						id: viceVersaIntention.userId,
					}),
				)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: targetAccount.id })
				.where((eb) =>
					eb.and({
						ownerAccountId: fromAccountId,
						id: asUserId,
					}),
				)
				.executeTakeFirst();
			await tx
				.deleteFrom("accountConnectionsIntentions")
				.where((eb) =>
					eb.and({
						accountId: targetAccount.id,
						targetAccountId: fromAccountId,
					}),
				)
				.executeTakeFirst();
		});
		return {
			account: {
				id: targetAccount.id,
				email: toEmail.lowercase,
				avatarUrl: targetAccount.avatarUrl || undefined,
			},
			connected: true,
			user: {
				name: user.name,
			},
		};
	}
	try {
		await database
			.insertInto("accountConnectionsIntentions")
			.values({
				accountId: fromAccountId,
				targetAccountId: targetAccount.id,
				userId: asUserId,
				createdAt: new Date(),
			})
			.executeTakeFirst();
		return {
			account: {
				id: targetAccount.id,
				email: toEmail.lowercase,
				avatarUrl: targetAccount.avatarUrl || undefined,
			},
			connected: false,
			user: {
				name: user.name,
			},
		};
	} catch (e) {
		// Could be like `duplicate key value violates unique constraint "..."`
		const message = String(e);
		if (
			message.includes(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.ACCOUNT_PAIR)
		) {
			const existingIntention = await database
				.selectFrom("accountConnectionsIntentions")
				.where((eb) =>
					eb.and({
						accountId: fromAccountId,
						targetAccountId: targetAccount.id,
					}),
				)
				.select(["userId"])
				.executeTakeFirstOrThrow();
			const existingUser = await database
				.selectFrom("users")
				.select("name")
				.where("id", "=", existingIntention.userId)
				.executeTakeFirstOrThrow();
			throw new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to "${toEmail.original}" as user "${existingUser.name}".`,
			});
		}
		if (
			message.includes(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.USER_PAIR)
		) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to user "${user.name}".`,
			});
			// This is probably a c8 bug
			/* c8 ignore next */
		}
		/* c8 ignore next 2 */
		throw e;
	}
};
