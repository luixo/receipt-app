import { createFileRoute } from "@tanstack/react-router";

import { AdminScreen } from "~app/features/admin/admin-screen";

export const Route = createFileRoute("/_protected/admin")({
	component: AdminScreen,
	head: () => ({ meta: [{ title: "RA - Admin panel" }] }),
});
