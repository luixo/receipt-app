import { z } from "zod/v4";

import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import { confirmEmailTokenSchema } from "~web/handlers/validation";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ResetPasswordScreen token={token} />;
};

const Route = createFileRoute("/_public/reset-password")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Reset password" }] }),
	validateSearch: z.object({
		token: confirmEmailTokenSchema.optional(),
	}),
});

export default Route.Screen;
