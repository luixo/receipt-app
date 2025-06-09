import { AccountScreen } from "~app/features/account/account-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/account")({
	component: AccountScreen,
	head: () => ({ meta: [{ title: "RA - My account" }] }),
});

export default Route.Screen;
