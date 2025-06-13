import { createFileRoute } from "@tanstack/react-router";

import { Receipt } from "~app/features/receipt/receipt";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <Receipt id={id} />;
};

export const Route = createFileRoute("/_protected/receipts/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Receipt" }] }),
});
