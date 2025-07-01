import { createFileRoute } from "@tanstack/react-router";

import { getTitle, loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => null;

export const Route = createFileRoute(
	"/_protected/debts/user/$id/exchange/specific",
)({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "exchangeDebts") }],
	}),
});
