import { createFileRoute } from "@tanstack/react-router";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { userIdSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	userId: userIdSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return <AddDebtScreen userIdState={useQueryState("userId")} />;
};

export const Route = createFileRoute("/_protected/debts/add")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "addDebt") }],
	}),
});
