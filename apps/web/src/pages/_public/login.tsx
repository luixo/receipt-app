import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "#app/features/login/login-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";

export const Route = createFileRoute("/_public/login")({
	component: LoginScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("login");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "login") }],
	}),
});
