import { createFileRoute } from "@tanstack/react-router";

import { AdminScreen } from "~app/features/admin/admin-screen";
import { loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/admin")({
	component: AdminScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "admin");
	},
	head: () => ({ meta: [{ title: "RA - Admin panel" }] }),
});
