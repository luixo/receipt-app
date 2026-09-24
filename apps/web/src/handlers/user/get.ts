import { TRPCError } from "@trpc/server";

import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get  user",
		description:
			"Returns the current  user's profile and its self-peer's name.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const { confirmationToken, id, name, avatarUrl, email, role } =
			await database
				.selectFrom("users")
				.innerJoin("peers", (jb) => jb.onRef("peers.id", "=", "users.id"))
				.select([
					"users.id",
					"peers.name",
					"users.confirmationToken",
					"users.avatarUrl",
					"users.email",
					"users.role",
				])
				.where("users.id", "=", ctx.auth.userId)
				.executeTakeFirstOrThrow(
					() =>
						/* c8 ignore start */
						new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `No result for "${ctx.auth.email}"  user found, self-peer may be non-existent.`,
						}),
					/* c8 ignore stop */
				);
		return {
			user: {
				id,
				email,
				verified: !confirmationToken,
				avatarUrl: avatarUrl || undefined,
				role: role ?? undefined,
			},
			peer: { name },
		};
	});
