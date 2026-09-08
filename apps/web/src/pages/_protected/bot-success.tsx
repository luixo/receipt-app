import { createFileRoute } from "@tanstack/react-router";

import { BotSuccessScreen } from "~app/features/bot-success/bot-success-screen";
import { getTitle } from "~web/utils/i18n";

export const Route = createFileRoute("/_protected/bot-success")({
	component: BotSuccessScreen,
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "botSuccess") }],
	}),
});
