import React from "react";
import { View } from "react-native";

import { useLocale } from "~app/hooks/use-locale";
import { formatCurrency } from "~app/utils/currency";
import { Checkbox } from "~components/checkbox";
import { Header } from "~components/header";
import { ArrowDown } from "~components/icons";
import type { ReceiptItemsId } from "~db/models";
import { round } from "~utils/math";

import { useReceiptContext } from "./context";

type InnerProps = {
	itemsRef: React.RefObject<Record<ReceiptItemsId, HTMLDivElement | null>>;
};

export const ReceiptEmptyItems: React.FC<InnerProps> = ({ itemsRef }) => {
	const { currencyCode, items } = useReceiptContext();
	const locale = useLocale();
	const emptyItems = items.filter((item) => item.consumers.length === 0);
	const onEmptyItemClick = React.useCallback(
		(id: ReceiptItemsId) => {
			const matchedItem = itemsRef.current[id];
			if (!matchedItem) {
				return;
			}
			matchedItem.scrollIntoView();
		},
		[itemsRef],
	);
	if (emptyItems.length === 0) {
		return;
	}
	return (
		<View className="gap-2">
			<Header size="sm">Items with no participants</Header>
			{emptyItems.map((item) => (
				<Checkbox
					key={item.id}
					color="warning"
					isSelected
					onChange={() => onEmptyItemClick(item.id)}
					icon={<ArrowDown />}
				>
					{`"${item.name}" — ${formatCurrency(
						locale,
						currencyCode,
						round(item.quantity * item.price),
					)}`}
				</Checkbox>
			))}
		</View>
	);
};
