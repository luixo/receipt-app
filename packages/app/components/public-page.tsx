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
} & Omit<React.ComponentProps<typeof Page>, "elements">;

export const PublicPage: React.FC<Props> = ({ children, ...props }) => (
	<Page elements={PUBLIC_ELEMENTS} {...props}>
		{children}
		<AuthEffect />
	</Page>
);
