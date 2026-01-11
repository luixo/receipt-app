import React from "react";

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";

import { PublicPage } from "~app/components/public-page";
import type { TRPCError } from "~app/trpc";
import { Spinner } from "~components/spinner";
import { captureSentryError } from "~web/utils/sentry";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => (
	<PublicPage>
		<React.Suspense fallback={<Spinner size="lg" />}>
			<Outlet />
		</React.Suspense>
	</PublicPage>
);

export const Route = createFileRoute("/_public")({
	beforeLoad: async ({ context, search }) => {
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
					// It's ok we get an error for the account on public route - bail out
					return;
				}
			}
			captureSentryError(error as Error);
			throw error;
		}
		// If we do get an account - we're authorized and we need to get to the app page
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({ to: search.redirect || "/receipts" });
	},
	component: Wrapper,
});
