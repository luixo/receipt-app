import { createFileRoute } from "@tanstack/react-router";

import { PlaygroundScreen } from "~app/features/playground/playground-screen";

export const Route = createFileRoute("/_public/playground")({
	component: PlaygroundScreen,
});
