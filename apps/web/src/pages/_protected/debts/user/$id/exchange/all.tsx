import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeAllScreen userId={id} />;
};

export const Route = createFileRoute("/_protected/debts/user/$id/exchange/all")(
	{
		component: Wrapper,
		loader: async (ctx) => {
			await loadNamespaces(ctx.context, "debts");
		},
		head: ({ match }) => ({
			meta: [{ title: getTitle(match.context, "exchangeAllDebts") }],
		}),
	},
);
