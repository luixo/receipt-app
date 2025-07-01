import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "~app/features/login/login-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_public/login")({
	component: LoginScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "login");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "login") }],
	}),
});
