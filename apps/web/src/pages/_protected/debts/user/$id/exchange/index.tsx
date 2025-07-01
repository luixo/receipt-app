import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeScreen userId={id} />;
};

export const Route = createFileRoute("/_protected/debts/user/$id/exchange/")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: () => ({ meta: [{ title: "RA - Exchange user debts" }] }),
});
