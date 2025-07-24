import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminScreen } from "~app/features/admin/admin-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/admin")({
	component: AdminScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "admin");
		const trpc = getLoaderTrpcClient(ctx.context);
		const account = await ctx.context.queryClient.fetchQuery(
			trpc.account.get.queryOptions(),
		);
		if (account.account.role !== "admin") {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({ to: "/" });
		}
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "admin") }],
	}),
});
