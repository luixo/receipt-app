import React from "react";

import { Checkbox, Spacer, Text } from "@nextui-org/react";

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
		<>
			<Text b h3>
				Items with no participants
			</Text>
			{items.map((item, index) => (
				<React.Fragment key={item.id}>
					{index === 0 ? null : <Spacer y={0.5} />}
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
					{index === items.length - 1 ? <Spacer y={1} /> : null}
				</React.Fragment>
			))}
		</>
	);
};
