import React from "react";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { ProtectedPage } from "~app/components/protected-page";
import { AUTH_COOKIE } from "~app/utils/auth";
import { ensureI18nInitialized } from "~app/utils/i18n";
import { Spinner } from "~components/spinner";
import { getCookie } from "~web/utils/cookies";

const Wrapper = () => (
	<ProtectedPage>
		<React.Suspense fallback={<Spinner size="lg" />}>
			<Outlet />
		</React.Suspense>
	</ProtectedPage>
);

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ context, location }) => {
		if (!context.request) {
			return;
		}
		const authToken = getCookie(
			context.request.headers.get("cookie") || "",
			AUTH_COOKIE,
		);
		if (!authToken) {
			await ensureI18nInitialized(context);
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
	},
	component: Wrapper,
});
