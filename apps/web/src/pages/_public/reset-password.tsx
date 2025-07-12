import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { resetPasswordTokenSchema } from "~app/utils/validation";

const Wrapper = () => {
	const { token } = Route.useSearch();
	return <ResetPasswordScreen token={token} />;
};

export const Route = createFileRoute("/_public/reset-password")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "reset-password");
	},
	validateSearch: zodValidator(
		z.object({
			token: resetPasswordTokenSchema.optional(),
		}),
	),
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "resetPassword") }],
	}),
});
