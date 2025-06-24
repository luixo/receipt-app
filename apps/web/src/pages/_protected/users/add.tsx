import { createFileRoute } from "@tanstack/react-router";

import { AddUserScreen } from "~app/features/add-user/add-user-screen";

export const Route = createFileRoute("/_protected/users/add")({
	component: AddUserScreen,
	head: () => ({ meta: [{ title: "RA - Add user" }] }),
});
