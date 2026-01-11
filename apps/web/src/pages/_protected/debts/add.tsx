import { createFileRoute } from "@tanstack/react-router";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { userIdSchema } from "~app/utils/validation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	userId: userIdSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const { useQueryState } = getQueryStates(Route);
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
