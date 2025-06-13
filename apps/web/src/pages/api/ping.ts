import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/ping")({
	GET: async () => new Response("Pong"),
});
