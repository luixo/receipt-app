import { createFileRoute, redirect } from "@tanstack/react-router";

import { HomeScreen } from "~app/features/home/home-screen";
import { ensureI18nInitialized } from "~app/utils/i18n";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		await ensureI18nInitialized(context);
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({ to: "/receipts" });
	},
	component: HomeScreen,
});
