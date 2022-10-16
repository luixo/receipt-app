import * as trpc from "@trpc/server";

import { Database } from "next-app/db";
import { ACCOUNT_CONNECTIONS_INTENTIONS } from "next-app/db/consts";
import { AccountsId, UsersId } from "next-app/db/models";
import { getUserById } from "next-app/handlers/users/utils";

export const addConnectionIntention = async (
	database: Database,
	fromAccountId: AccountsId,
	user: { name: string },
	toEmail: string,
	asUserId: UsersId
) => {
	const targetAccount = await database
		.selectFrom("accounts")
		.select("id")
		.where("email", "=", toEmail)
		.executeTakeFirst();
	if (!targetAccount) {
		throw new trpc.TRPCError({
			code: "NOT_FOUND",
			message: `Account with email ${toEmail} does not exist.`,
		});
	}
	const connectedUser = await database
		.selectFrom("accounts")
		.where("accounts.email", "=", toEmail)
		.innerJoin("users", (qb) =>
			qb
				.onRef("users.connectedAccountId", "=", "accounts.id")
				.on("users.ownerAccountId", "=", fromAccountId)
		)
		.select("users.name")
		.executeTakeFirst();
	if (connectedUser) {
		throw new trpc.TRPCError({
			code: "CONFLICT",
			message: `Account with email ${toEmail} is already connected to user ${connectedUser.name}.`,
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
				["name"]
			);
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to ${toEmail} as user ${
					existingUser!.name
				}.`,
			});
		}
		if (
			message.includes(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.USER_PAIR)
		) {
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to user ${user.name}.`,
			});
		}
		throw e;
	}
};

export const removeIntention = async (
	database: Database,
	intention:
		| {
				targetAccountId: AccountsId;
				accountId: AccountsId;
		  }
		| undefined,
	intentionType: string
) => {
	if (!intention) {
		throw new trpc.TRPCError({
			code: "NOT_FOUND",
			message: `Intention ${intentionType} does not exist.`,
		});
	}
	await database
		.deleteFrom("accountConnectionsIntentions")
		.where("accountId", "=", intention.accountId)
		.where("targetAccountId", "=", intention.targetAccountId)
		.execute();
};
