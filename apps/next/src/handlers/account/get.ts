import { TRPCError } from "@trpc/server";

import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const { confirmationToken, id, name } = await database
		.selectFrom("accounts")
		.innerJoin("users", (jb) => jb.onRef("users.id", "=", "accounts.id"))
		.select(["accounts.id", "users.name", "accounts.confirmationToken"])
		.where("accounts.id", "=", ctx.auth.accountId)
		.executeTakeFirstOrThrow(
			() =>
				new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `No result for "${ctx.auth.email}" account found, self-user may be non-existent.`,
				}),
		);
	return {
		account: { id, verified: !confirmationToken },
		user: { name },
	};
});
