import type { DB } from "~db/types.gen";
import { authProcedure } from "~web/handlers/trpc";

type Settings = Omit<DB["accountSettings"], "accountId" | "updatedAt">;

export const DEFAULT_ACCOUNT_SETTINGS: Settings = {
	manualAcceptDebts: false,
};

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const account = await database
		.selectFrom("accountSettings")
		.select(["accountSettings.manualAcceptDebts"])
		.where("accountSettings.accountId", "=", ctx.auth.accountId)
		.limit(1)
		.executeTakeFirst();
	return account || DEFAULT_ACCOUNT_SETTINGS;
});
