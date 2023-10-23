import { TRPCError } from "@trpc/server";
import type { z } from "zod";

import type { Database } from "next-app/db";
import { ACCOUNT_CONNECTIONS_INTENTIONS } from "next-app/db/consts";
import type { AccountsId, UsersId } from "next-app/db/models";
import { getUserById } from "next-app/handlers/users/utils";
import type { emailSchema } from "next-app/handlers/validation";

export const addConnectionIntention = async (
	database: Database,
	fromAccountId: AccountsId,
	user: { name: string },
	toEmail: z.infer<typeof emailSchema>,
	asUserId: UsersId,
) => {
	const targetAccount = await database
		.selectFrom("accounts")
		.select("id")
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
		.where("accountId", "=", targetAccount.id)
		.where("targetAccountId", "=", fromAccountId)
		.executeTakeFirst();
	if (viceVersaIntention) {
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: fromAccountId })
				.where("ownerAccountId", "=", targetAccount.id)
				.where("id", "=", viceVersaIntention.userId)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: targetAccount.id })
				.where("ownerAccountId", "=", fromAccountId)
				.where("id", "=", asUserId)
				.executeTakeFirst();
			await tx
				.deleteFrom("accountConnectionsIntentions")
				.where("accountId", "=", targetAccount.id)
				.where("targetAccountId", "=", fromAccountId)
				.executeTakeFirst();
		});
		return {
			id: targetAccount.id,
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
				created: new Date(),
			})
			.executeTakeFirst();
		return {
			id: targetAccount.id,
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
				.where("accountId", "=", fromAccountId)
				.where("targetAccountId", "=", targetAccount.id)
				.select(["userId"])
				.executeTakeFirstOrThrow();
			const existingUser = await getUserById(
				database,
				existingIntention.userId,
				["name"],
			);
			throw new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to "${
					toEmail.original
				}" as user "${existingUser!.name}".`,
			});
		}
		if (
			message.includes(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.USER_PAIR)
		) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to user "${user.name}".`,
			});
		}
		throw e;
	}
};
