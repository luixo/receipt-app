import type { ReceiptsDatabase } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";

type SettingsKey = Omit<ReceiptsDatabase["accountSettings"], "accountId">;
type Settings = {
	[K in keyof SettingsKey]: SettingsKey[K]["__select__"];
};

export const DEFAULT_ACCOUNT_SETTINGS: Settings = {
	autoAcceptDebts: false,
};

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const account = await database
		.selectFrom("accountSettings")
		.select(["accountSettings.autoAcceptDebts"])
		.where("accountSettings.accountId", "=", ctx.auth.accountId)
		.executeTakeFirst();
	return account || DEFAULT_ACCOUNT_SETTINGS;
});
