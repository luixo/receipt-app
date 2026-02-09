import { createFileRoute } from "@tanstack/react-router";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

export const Route = createFileRoute("/_public/void-account")({
	component: VoidAccountScreen,
	...searchParamsWithDefaults("/_public/void-account"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("void-account");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "voidAccount") }],
	}),
});
