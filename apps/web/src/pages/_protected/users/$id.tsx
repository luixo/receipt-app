import { createFileRoute } from "@tanstack/react-router";

import { UserScreen } from "~app/features/user/user-screen";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserScreen id={id} />;
};

export const Route = createFileRoute("/_protected/users/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - User" }] }),
});
