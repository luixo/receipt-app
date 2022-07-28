import React from "react";

import { Email } from "./email";

type Props = {
	token: string;
};

export const ConfirmEmailEmail: React.FC<Props> = ({ token }) => (
	<Email title="Receipt App confirm email">
		{[
			{ type: "text", text: "✨Welcome to Receipt App✨", size: "h3" },
			{
				type: "text",
				text: "Happy counting!",
			},
			{
				type: "action",
				text: "Confirm email",
				href: `confirm-email?token=${token}`,
			},
			{
				type: "text",
				text: "Didn’t register in Receipt App? Click below to void your account.",
			},
			{
				type: "action",
				text: "Void account",
				href: `void-account?token=${token}`,
			},
		]}
	</Email>
);
