import { createFileRoute } from "@tanstack/react-router";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { searchParamsMapping } from "~app/utils/navigation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults(
	searchParamsMapping["/void-account"],
);

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <VoidAccountScreen token={token} />;
};

export const Route = createFileRoute("/_public/void-account")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("void-account");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "voidAccount") }],
	}),
});
