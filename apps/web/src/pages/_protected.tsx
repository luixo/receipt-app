import React from "react";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { serialize } from "cookie";

import { ProtectedPage } from "~app/components/protected-page";
import type { TRPCError } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { ensureI18nInitialized } from "~app/utils/i18n";
import { Spinner } from "~components/spinner";
import { getNow } from "~utils/date";
import { getLoaderTrpcClient } from "~web/utils/trpc";

import { getOptions } from "../utils/cookies";

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
		const trpc = getLoaderTrpcClient(context);
		try {
			await context.queryClient.fetchQuery(trpc.account.get.queryOptions());
		} catch (error) {
			if (!(error instanceof TRPCClientError)) {
				throw error;
			}
			const castedError = error as TRPCError;
			if (castedError.data?.code !== "UNAUTHORIZED") {
				throw error;
			}
			await ensureI18nInitialized(context);
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw redirect({
				to: "/login",
				search: { redirect: location.href, ...location.search },
				headers: {
					"set-cookie": serialize(
						AUTH_COOKIE,
						"",
						getOptions({ expires: getNow.zonedDateTime() }),
					),
				},
			});
		}
	},
	component: Wrapper,
});
