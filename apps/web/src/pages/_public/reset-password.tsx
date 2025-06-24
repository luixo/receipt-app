import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import { confirmEmailTokenSchema } from "~web/handlers/validation";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ResetPasswordScreen token={token} />;
};

export const Route = createFileRoute("/_public/reset-password")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Reset password" }] }),
	validateSearch: zodValidator(
		z.object({
			token: confirmEmailTokenSchema.optional(),
		}),
	),
});
