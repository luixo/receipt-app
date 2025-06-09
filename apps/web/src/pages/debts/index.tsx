import { DebtsScreen } from "~app/features/debts/debts-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/debts")({
	component: DebtsScreen,
	head: () => ({ meta: [{ title: "RA - Debts" }] }),
});

export default Route.Screen;
