import { createFileRoute } from "@tanstack/react-router";

import { AddReceiptScreen } from "~app/features/add-receipt/add-receipt-screen";
import { loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/receipts/add")({
	component: AddReceiptScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "receipts");
	},
	head: () => ({ meta: [{ title: "RA - Add receipt" }] }),
});
