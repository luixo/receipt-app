import React from "react";

import {
	BsPersonCheck as LoginIcon,
	BsPersonPlusFill as RegisterIcon,
} from "react-icons/bs";

import { AuthEffect } from "~app/components/app/auth-effect";
import type { MenuElement } from "~app/components/page";
import { Page } from "~app/components/page";

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
