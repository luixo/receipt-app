import { createFileRoute } from "@tanstack/react-router";

import { AddReceiptScreen } from "#app/features/add-receipt/add-receipt-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/receipts/add")({
	component: AddReceiptScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("receipts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await Promise.all([
			ctx.context.queryClient.prefetchQuery(trpc.user.get.queryOptions()),
			ctx.context.queryClient.prefetchQuery(
				trpc.currency.top.queryOptions({ options: { type: "receipts" } }),
			),
		]);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addReceipt") }],
	}),
});
