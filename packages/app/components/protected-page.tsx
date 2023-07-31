import React from "react";

import { Loading } from "@nextui-org/react";
import {
	BsReceipt as ReceiptsIcon,
	BsGearFill as SettingsIcon,
} from "react-icons/bs";
import { FaUsers as UsersIcon, FaUser as AccountIcon } from "react-icons/fa";
import { MdAttachMoney as DebtsIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { MenuElement, Page } from "app/components/page";
import { useConnectionIntentions } from "app/hooks/use-connection-intentions";
import { useDebtsIntentions } from "app/hooks/use-debts-intentions";
import { useNonResolvedReceipts } from "app/hooks/use-non-resolved-receipts";
import { useRouter } from "app/hooks/use-router";
import { trpc } from "app/trpc";

const PROTECTED_ELEMENTS: MenuElement[] = [
	{
		Icon: ReceiptsIcon,
		href: "/receipts",
		text: "Receipts",
		useBadgeAmount: useNonResolvedReceipts,
	},
	{
		Icon: DebtsIcon,
		text: "Debts",
		href: "/debts",
		useBadgeAmount: useDebtsIntentions,
	},
	{
		Icon: UsersIcon,
		text: "Users",
		href: "/users",
		useBadgeAmount: useConnectionIntentions,
	},
	{ Icon: AccountIcon, text: "Account", href: "/account" },
	{ Icon: SettingsIcon, text: "Settings", href: "/settings" },
];

type Props = {
	children: React.ReactNode;
};

export const ProtectedPage: React.FC<Props> = ({ children }) => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery(undefined, {
		retry: (_count, error) => error.data?.code !== "UNAUTHORIZED",
	});
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			router.push("/login");
		}
	}, [accountQuery.error, router]);

	let element = children;
	if (accountQuery.status === "error") {
		if (accountQuery.error.data?.code === "UNAUTHORIZED") {
			element = <Loading size="xl" />;
		} else {
			element = <QueryErrorMessage query={accountQuery} />;
		}
	}
	if (accountQuery.status === "loading") {
		element = <Loading size="xl" />;
	}

	return (
		<Page
			elements={accountQuery.status === "success" ? PROTECTED_ELEMENTS : []}
		>
			{element}
		</Page>
	);
};
