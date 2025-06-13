import { createFileRoute } from "@tanstack/react-router";

import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserDebtsScreen userId={id} />;
};

export const Route = createFileRoute("/_protected/debts/user/$id/")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - User's debts" }] }),
});
