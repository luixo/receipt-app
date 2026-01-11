import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "~app/features/login/login-screen";
import { getTitle } from "~web/utils/i18n";

const Wrapper = () => {
	const searchParams = Route.useSearch();
	return <LoginScreen redirectUrl={searchParams.redirect || "/"} />;
};

export const Route = createFileRoute("/_public/login")({
	component: Wrapper,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("login");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "login") }],
	}),
});
