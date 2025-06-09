import { DebtScreen } from "~app/features/debt/debt-screen";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtScreen id={id} />;
};

const Route = createFileRoute("/_protected/debts/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Debt" }] }),
});

export default Route.Screen;
