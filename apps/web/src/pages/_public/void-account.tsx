import { createFileRoute } from "@tanstack/react-router";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { voidAccountTokenSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	token: voidAccountTokenSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <VoidAccountScreen token={token} />;
};

export const Route = createFileRoute("/_public/void-account")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "void-account");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "voidAccount") }],
	}),
});
