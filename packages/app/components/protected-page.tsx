import React from "react";

import { Loading } from "@nextui-org/react";
import {
	BsReceipt as ReceiptsIcon,
	BsGearFill as SettingsIcon,
} from "react-icons/bs";
import { FaUsers as UsersIcon, FaUser as AccountIcon } from "react-icons/fa";
import { MdAttachMoney as DebtsIcon } from "react-icons/md";
import { useRouter } from "solito/router";

import { QueryErrorMessage } from "app/components/error-message";
import { MenuElement, Page } from "app/components/page";
import { useConnectionIntentions } from "app/hooks/use-connection-intentions";
import { useDebtsSyncIntentions } from "app/hooks/use-debts-sync-intentions";
import { useNonResolvedReceipts } from "app/hooks/use-non-resolved-receipts";
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
		useBadgeAmount: useDebtsSyncIntentions,
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
	onData?: () => void;
};

export const ProtectedPage: React.FC<Props> = ({ children, onData }) => {
	const router = useRouter();
	const query = trpc.account.get.useQuery();
	React.useEffect(() => {
		if (query.error && query.error.data?.code === "UNAUTHORIZED") {
			router.push("/login");
		}
		if (query.data) {
			onData?.();
		}
	}, [router, query.error, query.data, onData]);

	let element = children;
	if (query.status === "error" && query.error.data?.code !== "UNAUTHORIZED") {
		element = <QueryErrorMessage query={query} />;
	}
	if (query.status === "loading") {
		element = <Loading size="xl" />;
	}

	return <Page elements={PROTECTED_ELEMENTS}>{element}</Page>;
};
