import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeSpecificScreen } from "~app/features/debts-exchange-specific/debts-exchange-specific-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute(
	"/_protected/debts/user/$id/exchange/specific",
)({
	component: DebtsExchangeSpecificScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "exchangeDebts") }],
	}),
});
