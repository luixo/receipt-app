import { createFileRoute, redirect } from "@tanstack/react-router";

import { HomeScreen } from "~app/features/home/home-screen";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		// eslint-disable-next-line typescript/only-throw-error
		throw redirect({ to: "/receipts", search: true });
	},
	component: HomeScreen,
});
