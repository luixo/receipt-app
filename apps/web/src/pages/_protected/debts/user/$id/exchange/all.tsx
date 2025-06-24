import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeAllScreen userId={id} />;
};

export const Route = createFileRoute("/_protected/debts/user/$id/exchange/all")(
	{
		component: Wrapper,
		head: () => ({ meta: [{ title: "RA - Exchange all user debts" }] }),
	},
);
