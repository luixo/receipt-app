import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordScreen } from "#app/features/reset-password/reset-password-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { searchParamsWithDefaults } from "#web/utils/navigation.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_public/reset-password")({
	component: ResetPasswordScreen,
	...searchParamsWithDefaults("/_public/reset-password"),
	loaderDeps: (opts) => ({ token: opts.search.token }),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("reset-password");
		const trpc = getLoaderTrpcClient(ctx.context);
		if (ctx.deps.token) {
			await ctx.context.queryClient.prefetchQuery(
				trpc.resetPasswordIntentions.get.queryOptions({
					token: ctx.deps.token,
				}),
			);
		}
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "resetPassword") }],
	}),
});
