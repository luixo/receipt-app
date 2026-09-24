import { createFileRoute } from "@tanstack/react-router";

import { VoidUserScreen } from "~app/features/void-user/void-user-screen";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

export const Route = createFileRoute("/_public/void-user")({
	component: VoidUserScreen,
	...searchParamsWithDefaults("/_public/void-user"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("void-user");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "voidUser") }],
	}),
});
