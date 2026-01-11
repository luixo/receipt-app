import { createFileRoute } from "@tanstack/react-router";

import { RegisterScreen } from "~app/features/register/register-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute("/_public/register")({
	component: RegisterScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("register");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "register") }],
	}),
});
