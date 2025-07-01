import { createFileRoute } from "@tanstack/react-router";

import { AddUserScreen } from "~app/features/add-user/add-user-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/users/add")({
	component: AddUserScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "addUser") }],
	}),
});
