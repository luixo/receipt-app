import { createFileRoute } from "@tanstack/react-router";

import { UserScreen } from "~app/features/user/user-screen";
import { loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserScreen id={id} />;
};

export const Route = createFileRoute("/_protected/users/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
	},
	head: () => ({ meta: [{ title: "RA - User" }] }),
});
