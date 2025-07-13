import { createFileRoute } from "@tanstack/react-router";

import { UserScreen } from "~app/features/user/user-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserScreen id={id} />;
};

export const Route = createFileRoute("/_protected/users/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.users.get.queryOptions({ id: ctx.params.id }),
		);
	},
	head: ({ match }) => ({ meta: [{ title: getTitle(match.context, "user") }] }),
});
