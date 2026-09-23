import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "~app/features/login/login-screen";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

export const Route = createFileRoute("/_public/login")({
	component: LoginScreen,
	...searchParamsWithDefaults("/_public/login"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("login");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "login") }],
		scripts:
			match.search.bot === "telegram"
				? [{ src: "https://telegram.org/js/telegram-web-app.js" }]
				: [],
	}),
});
