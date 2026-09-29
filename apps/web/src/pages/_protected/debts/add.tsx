import { createFileRoute } from "@tanstack/react-router";

import { AddDebtScreen } from "#app/features/add-debt/add-debt-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { searchParamsWithDefaults } from "#web/utils/navigation.ts";

export const Route = createFileRoute("/_protected/debts/add")({
	component: AddDebtScreen,
	...searchParamsWithDefaults("/_protected/debts/add"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addDebt") }],
	}),
});
