import type React from "react";
import { View } from "react-native";

import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { Button } from "~components/button";
import { Card, CardBody } from "~components/card";
import { ArrowIcon, ReceiptIcon, SyncIcon } from "~components/icons";
import { Link } from "~components/link";
import { Text } from "~components/text";

type Intentions = TRPCQueryOutput<"debtIntentions.getAll">;

type Props = {
	intention: Intentions[number];
	children?: React.ReactNode;
};

export const DebtIntention: React.FC<Props> = ({ intention, children }) => {
	const { formatDate, formatDateTime } = useFormat();
	const locale = useLocale();
	const intentionDataComponent = (
		<View className="flex-row gap-2">
			<Text className={intention.amount >= 0 ? "text-success" : "text-danger"}>
				{formatCurrency(
					locale,
					intention.currencyCode,
					Math.abs(intention.amount),
				)}
			</Text>
			<Text>{formatDate(intention.timestamp)}</Text>
		</View>
	);
	return (
		<Card>
			<CardBody className="gap-4">
				{intention.current ? (
					<View className="flex-row gap-2 max-sm:flex-col">
						<View className="flex-row gap-2">
							<Text
								className={
									intention.current.amount >= 0 ? "text-success" : "text-danger"
								}
							>
								{formatCurrency(
									locale,
									intention.current.currencyCode,
									Math.abs(intention.current.amount),
								)}
							</Text>
							<Text>{formatDate(intention.current.timestamp)}</Text>
						</View>
						<ArrowIcon size={24} />
						{intentionDataComponent}
					</View>
				) : (
					intentionDataComponent
				)}
				<View className="flex-row items-center gap-2">
					{intention.receiptId ? (
						<Button
							as={Link<"/receipts/$id">}
							to="/receipts/$id"
							params={{ id: intention.receiptId }}
							variant="bordered"
							color="primary"
							isIconOnly
							size="sm"
						>
							<ReceiptIcon size={12} />
						</Button>
					) : null}
					<Text>{intention.note}</Text>
				</View>
				<View className="flex-row justify-between">
					<View className="flex-row gap-1">
						<SyncIcon size={24} />
						<Text>{formatDateTime(intention.updatedAt)}</Text>
					</View>
					<View className="max-md:hidden">{children}</View>
				</View>
				<View className="self-end md:hidden">{children}</View>
			</CardBody>
		</Card>
	);
};
