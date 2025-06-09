import { LoginScreen } from "~app/features/login/login-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_public/login")({
	component: LoginScreen,
	head: () => ({ meta: [{ title: "RA - Login" }] }),
});

export default Route.Screen;
