import { Receipt } from "~app/features/receipt/receipt";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <Receipt id={id} />;
};

const Route = createFileRoute("/_protected/receipts/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Receipt" }] }),
});

export default Route.Screen;
