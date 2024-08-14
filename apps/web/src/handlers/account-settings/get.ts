import type { ReceiptsDatabase } from "~db/types";
import { authProcedure } from "~web/handlers/trpc";

type SettingsKey = Omit<ReceiptsDatabase["accountSettings"], "accountId">;
type Settings = {
	[K in keyof SettingsKey]: SettingsKey[K]["__select__"];
};

export const DEFAULT_ACCOUNT_SETTINGS: Settings = {
	manualAcceptDebts: false,
};

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const account = await database
		.selectFrom("accountSettings")
		.select(["accountSettings.manualAcceptDebts"])
		.where("accountSettings.accountId", "=", ctx.auth.accountId)
		.executeTakeFirst();
	return account || DEFAULT_ACCOUNT_SETTINGS;
});
