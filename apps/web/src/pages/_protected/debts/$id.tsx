import { createFileRoute } from "@tanstack/react-router";

import { DebtScreen } from "~app/features/debt/debt-screen";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtScreen id={id} />;
};

export const Route = createFileRoute("/_protected/debts/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Debt" }] }),
});
