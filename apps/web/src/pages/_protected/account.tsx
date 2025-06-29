import { createFileRoute } from "@tanstack/react-router";

import { AccountScreen } from "~app/features/account/account-screen";
import { loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/account")({
	component: AccountScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "account");
	},
	head: () => ({ meta: [{ title: "RA - My account" }] }),
});
