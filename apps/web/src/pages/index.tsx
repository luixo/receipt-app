import { createFileRoute, redirect } from "@tanstack/react-router";

import { HomeScreen } from "~app/features/home/home-screen";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		// oxlint-disable-next-line typescript/only-throw-error
		throw redirect({ to: "/receipts", search: true });
	},
	component: HomeScreen,
});
