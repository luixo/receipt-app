import { z } from "zod/v4";

import { ConfirmEmailScreen } from "~app/features/confirm-email/confirm-email-screen";
import { confirmEmailTokenSchema } from "~web/handlers/validation";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ConfirmEmailScreen token={token} />;
};

const Route = createFileRoute("/_public/confirm-email")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Confirm email" }] }),
	validateSearch: z.object({
		token: confirmEmailTokenSchema.optional(),
	}),
});

export default Route.Screen;
