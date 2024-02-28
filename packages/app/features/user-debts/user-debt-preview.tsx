import React from "react";
import { View } from "react-native";

import { Link } from "@nextui-org/react";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { Text } from "~components";

type Props = {
	debt: TRPCQuerySuccessResult<"debts.getUser">["data"][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currency = useFormattedCurrency(debt.currencyCode);
	const { formatDate } = useSsrFormat();
	return (
		<Link href={`/debts/${debt.id}`} className="flex flex-col items-stretch">
			<View className="flex-1 flex-row gap-2 p-2 max-sm:p-3">
				<View className="flex-[2]">
					<Text className={debt.amount >= 0 ? "text-success" : "text-danger"}>
						{Math.abs(debt.amount)} {currency}
					</Text>
				</View>
				<View className="flex-[2]">
					<Text>{formatDate(debt.timestamp)}</Text>
				</View>
				<View className="flex-1">
					<DebtSyncStatus debt={debt} />
				</View>
				<View className="flex-[3] max-sm:hidden">
					<Text>{debt.note}</Text>
				</View>
			</View>
			<View className="p-3 pb-5 sm:hidden">
				<Text>{debt.note}</Text>
			</View>
		</Link>
	);
};
