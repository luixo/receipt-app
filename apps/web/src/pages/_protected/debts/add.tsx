import { createFileRoute } from "@tanstack/react-router";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getPathHooks, searchParamsMapping } from "~app/utils/navigation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults(
	searchParamsMapping["/debts/add"],
);

const Wrapper = () => {
	const { useQueryState } = getPathHooks("/_protected/debts/add");
	return <AddDebtScreen userIdState={useQueryState("userId")} />;
};

export const Route = createFileRoute("/_protected/debts/add")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addDebt") }],
	}),
});
