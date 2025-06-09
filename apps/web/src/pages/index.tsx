import { HomeScreen } from "~app/features/home/home-screen";
import { createFileRoute } from "~web/utils/router";

const Route = createFileRoute("/")({
	component: HomeScreen,
});

export default Route.Screen;
