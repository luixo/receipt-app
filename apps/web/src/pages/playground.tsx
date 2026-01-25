import { createFileRoute } from "@tanstack/react-router";

import Index from "~mobile/app/index";

export const Route = createFileRoute("/playground")({
	component: Index,
});
