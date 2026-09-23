import { createFileRoute } from "@tanstack/react-router";

import { BotLinkScreen } from "~app/features/bot-link/bot-link-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute("/_protected/bot-link")({
	component: BotLinkScreen,
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "botLink") }],
		scripts: [{ src: "https://telegram.org/js/telegram-web-app.js" }],
	}),
});
