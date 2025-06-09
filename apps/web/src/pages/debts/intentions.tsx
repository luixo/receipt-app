import { DebtsIntentionsScreen } from "~app/features/debts-intentions/debts-intentions-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/debts/intentions")({
	component: DebtsIntentionsScreen,
	head: () => ({ meta: [{ title: "RA - Debts intentions" }] }),
});

export default Route.Screen;
