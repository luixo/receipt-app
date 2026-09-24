import type { DB } from "~db/types.gen";
import { authProcedure } from "~web/handlers/trpc";

type Settings = Omit<DB["userSettings"], "userId" | "updatedAt">;

export const DEFAULT_ACCOUNT_SETTINGS: Settings = {
	manualAcceptDebts: false,
};

export const procedure = authProcedure
	.meta({
		title: "Get user settings",
		description:
			"Returns the current  user's settings, falling back to defaults if none are set.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("userSettings")
			.select(["userSettings.manualAcceptDebts"])
			.where("userSettings.userId", "=", ctx.auth.userId)
			.limit(1)
			.executeTakeFirst();
		return user || DEFAULT_ACCOUNT_SETTINGS;
	});
