import { createFileRoute } from "@tanstack/react-router";

import { DebtsTransferScreen } from "~app/features/debts-transfer/debts-transfer-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { userIdSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	to: userIdSchema.optional().catch(undefined),
	from: userIdSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return (
		<DebtsTransferScreen
			fromIdState={useQueryState("from")}
			toIdState={useQueryState("to")}
		/>
	);
};

export const Route = createFileRoute("/_protected/debts/transfer")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loaderDeps: ({ search: { to, from } }) => ({ to, from }),
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await Promise.all(
			[ctx.deps.to, ctx.deps.from].map(async (userId) => {
				if (userId) {
					await ctx.context.queryClient.fetchQuery(
						trpc.users.get.queryOptions({ id: userId }),
					);
				}
			}),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "transferDebts") }],
	}),
});
