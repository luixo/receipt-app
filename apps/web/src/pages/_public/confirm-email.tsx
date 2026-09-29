import { createFileRoute } from "@tanstack/react-router";

import { ConfirmEmailScreen } from "#app/features/confirm-email/confirm-email-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { searchParamsWithDefaults } from "#web/utils/navigation.ts";

export const Route = createFileRoute("/_public/confirm-email")({
	component: ConfirmEmailScreen,
	...searchParamsWithDefaults("/_public/confirm-email"),
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "confirmEmail") }],
	}),
});
