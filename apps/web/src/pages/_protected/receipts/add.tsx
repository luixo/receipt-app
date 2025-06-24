import { createFileRoute } from "@tanstack/react-router";

import { AddReceiptScreen } from "~app/features/add-receipt/add-receipt-screen";

export const Route = createFileRoute("/_protected/receipts/add")({
	component: AddReceiptScreen,
	head: () => ({ meta: [{ title: "RA - Add receipt" }] }),
});
