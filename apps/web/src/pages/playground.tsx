import { createFileRoute } from "@tanstack/react-router";

import Wrapper from "~mobile/app/index";

export const Route = createFileRoute("/playground")({
	component: Wrapper,
});
