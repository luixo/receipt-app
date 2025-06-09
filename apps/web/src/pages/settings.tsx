import { SettingsScreen } from "~app/features/settings/settings-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/settings")({
	component: SettingsScreen,
	head: () => ({ meta: [{ title: "RA - Settings" }] }),
});

export default Route.Screen;
