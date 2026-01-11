import { createFileRoute } from "@tanstack/react-router";

import { ConfirmEmailScreen } from "~app/features/confirm-email/confirm-email-screen";
import { confirmEmailTokenSchema } from "~app/utils/validation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	token: confirmEmailTokenSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ConfirmEmailScreen token={token} />;
};

export const Route = createFileRoute("/_public/confirm-email")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "confirmEmail") }],
	}),
});
