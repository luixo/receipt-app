import { createFileRoute } from "@tanstack/react-router";

import { DebtScreen } from "~app/features/debt/debt-screen";
import { loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtScreen id={id} />;
};

export const Route = createFileRoute("/_protected/debts/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: () => ({ meta: [{ title: "RA - Debt" }] }),
});
