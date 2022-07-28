import React from "react";

import { Email } from "./email";

type Props = {
	token: string;
};

export const ResetPasswordEmail: React.FC<Props> = ({ token }) => (
	<Email
		title="Receipt App reset password"
		footerChildren={[
			{ type: "text", text: "This link will expire in the next 24 hours." },
		]}
	>
		{[
			{ type: "text", text: "Forgot your password?", size: "h3" },
			{
				type: "text",
				text: "We received a request to reset your password.",
			},
			{
				type: "action",
				text: "Reset my password",
				href: `reset-password?token=${token}`,
			},
			{
				type: "text",
				text: "Didn’t request a password reset? You can ignore this message.",
			},
		]}
	</Email>
);
