import { createFileRoute } from "@tanstack/react-router";

import { HomeScreen } from "~app/features/home/home-screen";

export const Route = createFileRoute("/")({
	component: HomeScreen,
});
