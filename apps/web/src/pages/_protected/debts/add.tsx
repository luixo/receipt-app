import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { userIdSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		userId: userIdSchema.optional(),
	}),
	{ userId: undefined },
);

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return <AddDebtScreen userIdState={useQueryState("userId")} />;
};

export const Route = createFileRoute("/_protected/debts/add")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	validateSearch: zodValidator({ schema, output: "input" }),
	search: { middlewares: [stripSearchParams(defaults)] },
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "addDebt") }],
	}),
});
