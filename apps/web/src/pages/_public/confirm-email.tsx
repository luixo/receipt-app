import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { ConfirmEmailScreen } from "~app/features/confirm-email/confirm-email-screen";
import { getTitle } from "~app/utils/i18n";
import { confirmEmailTokenSchema } from "~app/utils/validation";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ConfirmEmailScreen token={token} />;
};

export const Route = createFileRoute("/_public/confirm-email")({
	component: Wrapper,
	validateSearch: zodValidator(
		z.object({
			token: confirmEmailTokenSchema.optional(),
		}),
	),
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "confirmEmail") }],
	}),
});
