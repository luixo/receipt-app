import { ConnectionIntentionsScreen } from "~app/features/connection-intentions/connection-intentions-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/users/connections")({
	component: ConnectionIntentionsScreen,
	head: () => ({ meta: [{ title: "RA - Users connections" }] }),
});

export default Route.Screen;
