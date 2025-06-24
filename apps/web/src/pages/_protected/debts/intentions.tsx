import { createFileRoute } from "@tanstack/react-router";

import { DebtsIntentionsScreen } from "~app/features/debts-intentions/debts-intentions-screen";

export const Route = createFileRoute("/_protected/debts/intentions")({
	component: DebtsIntentionsScreen,
	head: () => ({ meta: [{ title: "RA - Debts intentions" }] }),
});
