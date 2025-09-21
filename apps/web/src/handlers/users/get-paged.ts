import { z } from "zod";

import { limitSchema, offsetSchema } from "~app/utils/validation";
import type { UserId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	cursor: offsetSchema,
	limit: limitSchema,
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<UserId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const accountUsers = database.selectFrom("users").where((eb) =>
		eb("users.ownerAccountId", "=", auth.accountId).and(
			"users.id",
			"<>",
			// Typesystem doesn't know that we use account id as self user id;
			auth.accountId as UserId,
		),
	);
	const [users, usersCount] = await Promise.all([
		accountUsers
			.select("users.id")
			// Stable order for users with the same name
			.orderBy("users.name")
			.orderBy("users.id")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		accountUsers
			.select(database.fn.count<string>("id").as("amount"))
			.executeTakeFirstOrThrow(),
	]);

	return {
		count: parseInt(usersCount.amount, 10),
		cursor: input.cursor,
		items: users.map(({ id }) => id),
	};
};

const queueUserList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, UserId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure.input(inputSchema).query(queueUserList);
