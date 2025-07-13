import { createFileRoute } from "@tanstack/react-router";

import { AddReceiptScreen } from "~app/features/add-receipt/add-receipt-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/receipts/add")({
	component: AddReceiptScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "receipts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await Promise.all([
			ctx.context.queryClient.prefetchQuery(trpc.account.get.queryOptions()),
			ctx.context.queryClient.prefetchQuery(
				trpc.currency.top.queryOptions({ options: { type: "receipts" } }),
			),
		]);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "addReceipt") }],
	}),
});
