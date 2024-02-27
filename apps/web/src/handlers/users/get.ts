import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountsId, UsersId } from "~web/db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

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
	ReturnType<typeof mapUser>
>((ctx) => async (inputs) => {
	const users = await fetchUsers(
		ctx,
		inputs.map(({ id }) => id),
	);
	return inputs.map((input) => {
		const matchedUser = users.find((user) => user.id === input.id);
		if (!matchedUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		return mapUser(matchedUser);
	});
});

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(queueUser);
