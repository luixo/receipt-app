import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { ConfirmEmailScreen } from "~app/features/confirm-email/confirm-email-screen";
import { confirmEmailTokenSchema } from "~web/handlers/validation";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ConfirmEmailScreen token={token} />;
};

export const Route = createFileRoute("/_public/confirm-email")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Confirm email" }] }),
	validateSearch: zodValidator(
		z.object({
			token: confirmEmailTokenSchema.optional(),
		}),
	),
});
