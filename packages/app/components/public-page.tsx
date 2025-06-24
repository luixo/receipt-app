import type React from "react";

import { AuthEffect } from "~app/components/app/auth-effect";
import { Page } from "~app/components/page";
import { LoginIcon, RegisterIcon } from "~components/icons";

type Props = {
	children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Page>, "elements">;

export const PublicPage: React.FC<Props> = ({ children, ...props }) => (
	<Page
		elements={[
			{
				pathname: "/login",
				Icon: LoginIcon,
				text: "Login",
			},
			{
				pathname: "/register",
				Icon: RegisterIcon,
				text: "Register",
			},
		]}
		{...props}
	>
		{children}
		<AuthEffect />
	</Page>
);
