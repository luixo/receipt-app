import React from "react";
import { View } from "react-native";

import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCQueryOutput } from "~app/trpc";
import { Card, CardBody, Text } from "~components";
import { ArrowIcon, SyncIcon } from "~components/icons";

type Intentions = TRPCQueryOutput<"debts.getIntentions">;

type Props = {
	intention: Intentions[number];
	children?: React.ReactNode;
};

export const DebtIntention = React.forwardRef<HTMLDivElement, Props>(
	({ intention, children }, ref) => {
		const { formatDate, formatDateTime } = useSsrFormat();
		const currency = useFormattedCurrency(intention.currencyCode);
		const selfCurrency = useFormattedCurrency(intention.current?.currencyCode);
		const intentionDataComponent = (
			<View className="flex-row gap-2">
				<Text
					className={intention.amount >= 0 ? "text-success" : "text-danger"}
				>
					{Math.abs(intention.amount)} {currency}
				</Text>
				<Text>{formatDate(intention.timestamp)}</Text>
			</View>
		);
		return (
			<Card ref={ref}>
				<CardBody className="gap-4">
					{intention.current ? (
						<View className="flex-row gap-2 max-sm:flex-col">
							<View className="flex-row gap-2">
								<Text
									className={
										intention.current.amount >= 0
											? "text-success"
											: "text-danger"
									}
								>
									{Math.abs(intention.current.amount)} {selfCurrency}
								</Text>
								<Text>{formatDate(intention.current.timestamp)}</Text>
							</View>
							<ArrowIcon size={24} />
							{intentionDataComponent}
						</View>
					) : (
						intentionDataComponent
					)}
					<Text>{intention.note}</Text>
					<View className="flex-row justify-between">
						<View className="flex-row gap-1">
							<SyncIcon size={24} />
							<Text>{formatDateTime(intention.lockedTimestamp)}</Text>
						</View>
						<View className="max-md:hidden">{children}</View>
					</View>
					<View className="self-end md:hidden">{children}</View>
				</CardBody>
			</Card>
		);
	},
);
