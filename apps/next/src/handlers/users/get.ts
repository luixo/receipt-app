import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountsId, UsersId } from "next-app/db/models";
import { queueCallFactory } from "next-app/handlers/batch";
import type { AuthorizedContext } from "next-app/handlers/context";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

const fetchUsers = async (
	{ database, auth }: AuthorizedContext,
	ids: UsersId[],
) =>
	database
		.selectFrom("users")
		.leftJoin("accounts", (qb) =>
			qb.onRef("connectedAccountId", "=", "accounts.id"),
		)
		.where("users.id", "in", ids)
		.where("users.ownerAccountId", "=", auth.accountId)
		.select([
			"users.id",
			"users.name",
			"users.publicName",
			"accounts.id as accountId",
			"accounts.avatarUrl",
			"accounts.email",
		])
		.execute();

const mapUser = (user: Awaited<ReturnType<typeof fetchUsers>>[number]) => ({
	id: user.id,
	name: user.name,
	publicName: user.publicName === null ? undefined : user.publicName,
	connectedAccount:
		user.email === null || user.accountId === null
			? undefined
			: ({
					id: user.accountId,
					email: user.email,
					avatarUrl: user.avatarUrl || undefined,
			  } as {
					id: AccountsId;
					email: string;
					avatarUrl?: string;
			  }),
});

const queueUser = queueCallFactory<
	AuthorizedContext,
	{ id: UsersId },
	ReturnType<typeof mapUser>,
	Awaited<ReturnType<typeof fetchUsers>>
>(
	async (ctx, inputs) =>
		fetchUsers(
			ctx,
			inputs.map(({ id }) => id),
		),
	async (_ctx, input, users) => {
		const matchedUser = users.find((user) => user.id === input.id);
		if (!matchedUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		return mapUser(matchedUser);
	},
);

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(queueUser);
