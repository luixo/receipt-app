import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "~app/features/login/login-screen";

export const Route = createFileRoute("/_public/login")({
	component: LoginScreen,
	head: () => ({ meta: [{ title: "RA - Login" }] }),
});
