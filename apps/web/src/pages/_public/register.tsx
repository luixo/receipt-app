import { createFileRoute } from "@tanstack/react-router";

import { RegisterScreen } from "~app/features/register/register-screen";

export const Route = createFileRoute("/_public/register")({
	component: RegisterScreen,
	head: () => ({ meta: [{ title: "RA - Register" }] }),
});
