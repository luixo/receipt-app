import { createFileRoute } from "@tanstack/react-router";

import { ConnectionIntentionsScreen } from "~app/features/connection-intentions/connection-intentions-screen";
import { loadNamespaces } from "~app/utils/i18n";

export const Route = createFileRoute("/_protected/users/connections")({
	component: ConnectionIntentionsScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
	},
	head: () => ({ meta: [{ title: "RA - Users connections" }] }),
});
