import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { voidAccountTokenSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({ token: voidAccountTokenSchema }),
	{ token: "" },
);

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <VoidAccountScreen token={token} />;
};

export const Route = createFileRoute("/_public/void-account")({
	component: Wrapper,
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "void-account");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "voidAccount") }],
	}),
});
