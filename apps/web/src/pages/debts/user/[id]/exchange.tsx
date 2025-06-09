import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeScreen userId={id} />;
};

const Route = createFileRoute("/_protected/debts/user/$id/exchange")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Exchange user debts" }] }),
});

export default Route.Screen;
