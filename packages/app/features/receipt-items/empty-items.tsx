import React from "react";
import { View } from "react-native";

import { Checkbox, Spacer } from "@nextui-org/react";

import { Text } from "app/components/base/text";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import type { TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";
import type { ReceiptItemsId } from "next-app/db/models";

type Item = TRPCQueryOutput<"receiptItems.get">["items"][number];

type Props = {
	items: Item[];
	currencyCode?: CurrencyCode;
	onClick: (itemId: ReceiptItemsId) => void;
};

export const EmptyItems: React.FC<Props> = ({
	items,
	currencyCode,
	onClick,
}) => {
	const currency = useFormattedCurrency(currencyCode);
	return (
		<View>
			<Text className="text-2xl font-medium">Items with no participants</Text>
			{items.map((item) => (
				<React.Fragment key={item.id}>
					<Spacer y={1} />
					<Checkbox
						isIndeterminate
						color="warning"
						labelColor="warning"
						isSelected
						onChange={() => onClick(item.id)}
					>
						{`"${item.name}" — ${round(
							item.quantity * item.price,
						)} ${currency}`}
					</Checkbox>
				</React.Fragment>
			))}
		</View>
	);
};
