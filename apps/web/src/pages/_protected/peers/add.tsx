import { createFileRoute } from "@tanstack/react-router";

import { AddPeerScreen } from "~app/features/add-peer/add-peer-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute("/_protected/peers/add")({
	component: AddPeerScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("peers");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "addPeer") }],
	}),
});
