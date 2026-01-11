import { createFileRoute } from "@tanstack/react-router";

import { Receipt } from "~app/features/receipt/receipt";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <Receipt id={id} />;
};

export const Route = createFileRoute("/_protected/receipts/$id")({
	component: Wrapper,
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
