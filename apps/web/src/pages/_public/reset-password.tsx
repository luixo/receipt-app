import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { resetPasswordTokenSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		token: resetPasswordTokenSchema.optional(),
	}),
	{ token: "" },
);

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ResetPasswordScreen token={token} />;
};

export const Route = createFileRoute("/_public/reset-password")({
	component: Wrapper,
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	loaderDeps: (opts) => ({ token: opts.search.token }),
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "reset-password");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.resetPasswordIntentions.get.queryOptions({ token: ctx.deps.token }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "resetPassword") }],
	}),
});
