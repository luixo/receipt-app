import React from "react";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { serialize } from "cookie";

import { ProtectedPage } from "~app/components/protected-page";
import type { TRPCError } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { Spinner } from "~components/spinner";
import { getNow } from "~utils/date";
import { captureSentryError } from "~web/utils/sentry";
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
			if (error instanceof TRPCClientError) {
				const castedError = error as TRPCError;
				if (castedError.data?.code === "UNAUTHORIZED") {
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
			}
			captureSentryError(error as Error);
			throw error;
		}
	},
	component: Wrapper,
});
