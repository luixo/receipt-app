import { createFileRoute } from "@tanstack/react-router";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

export const Route = createFileRoute("/_protected/debts/add")({
	component: AddDebtScreen,
	...searchParamsWithDefaults("/debts/add"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addDebt") }],
	}),
});
