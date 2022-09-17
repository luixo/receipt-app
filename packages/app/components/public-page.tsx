import React from "react";

import {
	BsPersonPlusFill as RegisterIcon,
	BsPersonCheck as LoginIcon,
} from "react-icons/bs";
import { useRouter } from "solito/router";

import { MenuElement, Page } from "app/components/page";
import { trpc } from "app/trpc";

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

export const PublicPage: React.FC<Props> = ({ children }) => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery();
	React.useEffect(() => {
		if (accountQuery.status === "success") {
			router.replace("/");
		}
	}, [accountQuery.status, router]);

	return <Page elements={PUBLIC_ELEMENTS}>{children}</Page>;
};
