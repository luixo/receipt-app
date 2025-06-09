import { AddReceiptScreen } from "~app/features/add-receipt/add-receipt-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/receipts/add")({
	component: AddReceiptScreen,
	head: () => ({ meta: [{ title: "RA - Add receipt" }] }),
});

export default Route.Screen;
