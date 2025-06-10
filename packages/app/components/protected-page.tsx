import type React from "react";

import { useQuery } from "@tanstack/react-query";

import {
	AdminWrapper,
	AdminWrapperWithEffect,
} from "~app/components/app/admin-wrapper";
import { NoAuthEffect } from "~app/components/app/no-auth-effect";
import { Page } from "~app/components/page";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { useTRPC } from "~app/utils/trpc";
import {
	AccountIcon,
	AdminIcon,
	DebtsIcon,
	ReceiptsIcon,
	SettingsIcon,
	UsersIcon,
} from "~components/icons";

const useShowAdmin = () => {
	const trpc = useTRPC();
	const accountQuery = useQuery(trpc.account.get.queryOptions());
	const role =
		accountQuery.status === "success" ? accountQuery.data.account.role : null;
	return role === "admin";
};

type Props = {
	children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Page>, "elements">;

export const ProtectedPage: React.FC<Props> = ({ children, ...props }) => (
	<Page
		elements={[
			{
				Icon: ReceiptsIcon,
				urlParams: { to: "/receipts" },
				text: "Receipts",
			},
			{
				Icon: DebtsIcon,
				text: "Debts",
				urlParams: { to: "/debts" },
				useBadgeAmount: useDebtsIntentions,
			},
			{
				Icon: UsersIcon,
				text: "Users",
				urlParams: { to: "/users" },
				useBadgeAmount: useConnectionIntentions,
			},
			{
				Icon: AccountIcon,
				text: "Account",
				urlParams: { to: "/account" },
			},
			{
				Icon: SettingsIcon,
				text: "Settings",
				urlParams: { to: "/settings" },
			},
			{
				Icon: AdminIcon,
				urlParams: { to: "/admin" },
				text: "Admin",
				useShow: useShowAdmin,
				PageWrapper: AdminWrapperWithEffect,
				ItemWrapper: AdminWrapper,
			},
		]}
		{...props}
	>
		{children}
		<NoAuthEffect />
	</Page>
);
