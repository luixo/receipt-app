import { AdminScreen } from "~app/features/admin/admin-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/admin")({
	component: AdminScreen,
	head: () => ({ meta: [{ title: "RA - Admin panel" }] }),
});

export default Route.Screen;
