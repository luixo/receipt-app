import React from "react";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { PublicPage } from "~app/components/public-page";
import { AUTH_COOKIE } from "~app/utils/auth";
import { ensureI18nInitialized } from "~app/utils/i18n";
import { Spinner } from "~components/spinner";
import { getCookie } from "~web/utils/cookies";

const Wrapper = () => (
	<PublicPage>
		<React.Suspense fallback={<Spinner size="lg" />}>
			<Outlet />
		</React.Suspense>
	</PublicPage>
);

export const Route = createFileRoute("/_public")({
	beforeLoad: async ({ context }) => {
		if (!context.request) {
			return;
		}
		const authToken = getCookie(
			context.request.headers.get("cookie") || "",
			AUTH_COOKIE,
		);
		if (authToken) {
			await ensureI18nInitialized(context);
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({ to: "/receipts", search: true });
		}
	},
	component: Wrapper,
});
