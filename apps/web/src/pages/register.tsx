import { RegisterScreen } from "~app/features/register/register-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/_public/register")({
	component: RegisterScreen,
	head: () => ({ meta: [{ title: "RA - Register" }] }),
});

export default Route.Screen;
