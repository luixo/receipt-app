import { createFileRoute } from "@tanstack/react-router";

import { DebtsScreen } from "~app/features/debts/debts-screen";

export const Route = createFileRoute("/_protected/debts/")({
	component: DebtsScreen,
	head: () => ({ meta: [{ title: "RA - Debts" }] }),
});
