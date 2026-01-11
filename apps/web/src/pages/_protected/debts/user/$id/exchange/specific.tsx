import { createFileRoute } from "@tanstack/react-router";

import { getTitle } from "~web/utils/i18n";

const Wrapper = () => null;

export const Route = createFileRoute(
	"/_protected/debts/user/$id/exchange/specific",
)({
	component: Wrapper,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "exchangeDebts") }],
	}),
});
