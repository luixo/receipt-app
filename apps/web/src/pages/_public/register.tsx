import { createFileRoute } from "@tanstack/react-router";

import { RegisterScreen } from "~app/features/register/register-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_public/register")({
	component: RegisterScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "register");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "register") }],
	}),
});
