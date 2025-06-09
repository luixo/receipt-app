import { AddUserScreen } from "~app/features/add-user/add-user-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_protected/users/add")({
	component: AddUserScreen,
	head: () => ({ meta: [{ title: "RA - Add user" }] }),
});

export default Route.Screen;
