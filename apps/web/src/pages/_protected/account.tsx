import { createFileRoute } from "@tanstack/react-router";

import { AccountScreen } from "~app/features/account/account-screen";

export const Route = createFileRoute("/_protected/account")({
	component: AccountScreen,
	head: () => ({ meta: [{ title: "RA - My account" }] }),
});
