import { TRPCError } from "@trpc/server";

import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get account",
		description:
			"Returns the current account's profile and its self-peer's name.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const { confirmationToken, id, name, avatarUrl, email, role } =
			await database
				.selectFrom("accounts")
				.innerJoin("peers", (jb) => jb.onRef("peers.id", "=", "accounts.id"))
				.select([
					"accounts.id",
					"peers.name",
					"accounts.confirmationToken",
					"accounts.avatarUrl",
					"accounts.email",
					"accounts.role",
				])
				.where("accounts.id", "=", ctx.auth.accountId)
				.executeTakeFirstOrThrow(
					() =>
						/* c8 ignore start */
						new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `No result for "${ctx.auth.email}" account found, self-peer may be non-existent.`,
						}),
					/* c8 ignore stop */
				);
		return {
			account: {
				id,
				email,
				verified: !confirmationToken,
				avatarUrl: avatarUrl || undefined,
				role: role ?? undefined,
			},
			peer: { name },
		};
	});
