import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/ping").methods({
	GET: async () => new Response("Pong"),
});
