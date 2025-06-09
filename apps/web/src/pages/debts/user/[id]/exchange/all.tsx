import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeAllScreen userId={id} />;
};

const Route = createFileRoute("/_protected/debts/user/$id/exchange/all")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Exchange all user debts" }] }),
});

export default Route.Screen;
