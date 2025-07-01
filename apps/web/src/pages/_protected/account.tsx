import { createFileRoute } from "@tanstack/react-router";

import { AccountScreen } from "~app/features/account/account-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/account")({
	component: AccountScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "account");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "account") }],
	}),
});
