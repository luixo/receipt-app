import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "~app/features/login/login-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const searchParams = Route.useSearch();
	return <LoginScreen redirectUrl={searchParams.redirect || "/"} />;
};

export const Route = createFileRoute("/_public/login")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "login");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "login") }],
	}),
});
