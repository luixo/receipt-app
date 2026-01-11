import { createFileRoute } from "@tanstack/react-router";

import { AddUserScreen } from "~app/features/add-user/add-user-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute("/_protected/users/add")({
	component: AddUserScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("users");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addUser") }],
	}),
});
