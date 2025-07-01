import { createFileRoute } from "@tanstack/react-router";

import { Receipt } from "~app/features/receipt/receipt";
import { loadNamespaces } from "~app/utils/i18n";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <Receipt id={id} />;
};

export const Route = createFileRoute("/_protected/receipts/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "receipts");
	},
	head: () => ({ meta: [{ title: "RA - Receipt" }] }),
});
