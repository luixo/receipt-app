import { createFileRoute } from "@tanstack/react-router";

import { ReceiptScreen } from "~app/features/receipt/receipt-screen";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/receipts/$id")({
	component: ReceiptScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("receipts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const receipt = await ctx.context.queryClient.fetchQuery(
			trpc.receipts.get.queryOptions({ id: ctx.params.id }),
		);
		return { receiptName: receipt.name };
	},
	head: ({ match, loaderData: data }) => ({
		meta: [
			{
				title: data
					? getTitle(match.context.i18nContext, "receipt", {
							name: data.receiptName,
						})
					: getTitle(match.context.i18nContext, "receiptUnknown"),
			},
		],
	}),
});
