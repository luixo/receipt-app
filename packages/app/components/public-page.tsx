import React from "react";

import { AuthEffect } from "~app/components/app/auth-effect";
import type { MenuElement } from "~app/components/page";
import { Page } from "~app/components/page";
import { LoginIcon, RegisterIcon } from "~components/icons";

const PUBLIC_ELEMENTS: MenuElement[] = [
	{
		href: "/login",
		Icon: LoginIcon,
		text: "Login",
	},
	{
		href: "/register",
		Icon: RegisterIcon,
		text: "Register",
	},
];

type Props = {
	children: React.ReactNode;
};

export const PublicPage: React.FC<Props> = ({ children }) => (
	<Page elements={PUBLIC_ELEMENTS}>
		{children}
		<AuthEffect />
	</Page>
);
