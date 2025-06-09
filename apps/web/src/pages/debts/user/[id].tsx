import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserDebtsScreen userId={id} />;
};

const Route = createFileRoute("/_protected/debts/user/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - User's debts" }] }),
});

export default Route.Screen;
