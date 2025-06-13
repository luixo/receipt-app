import { createFileRoute } from "@tanstack/react-router";

import { ConnectionIntentionsScreen } from "~app/features/connection-intentions/connection-intentions-screen";

export const Route = createFileRoute("/_protected/users/connections")({
	component: ConnectionIntentionsScreen,
	head: () => ({ meta: [{ title: "RA - Users connections" }] }),
});
