import type React from "react";

import { AuthEffect } from "~app/components/app/auth-effect";
import type { MenuElement } from "~app/components/page";
import { Page } from "~app/components/page";
import type { UrlParams } from "~app/hooks/use-navigation";
import { LoginIcon, RegisterIcon } from "~components/icons";

const PUBLIC_ELEMENTS: MenuElement[] = [
	{
		urlParams: { to: "/login" } satisfies UrlParams<"/login">,
		Icon: LoginIcon,
		text: "Login",
	},
	{
		urlParams: { to: "/register" } satisfies UrlParams<"/register">,
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
