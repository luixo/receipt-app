import React from "react";

import { useTranslation } from "react-i18next";

import { useLocale } from "#app/hooks/use-locale.ts";
import { formatCurrency } from "#app/utils/currency.ts";
import { Checkbox } from "#components/checkbox.tsx";
import { Icon } from "#components/icons.tsx";
import { Text } from "#components/text.tsx";
import type { ViewHandle } from "#components/view.base.tsx";
import { View } from "#components/view.tsx";
import type { ReceiptItemId } from "#db/ids.ts";
import { round } from "#utils/math.ts";

import { useReceiptContext } from "./context";

type InnerProps = {
	itemsRef: React.RefObject<Record<ReceiptItemId, ViewHandle | null>>;
};

export const ReceiptEmptyItems: React.FC<InnerProps> = ({ itemsRef }) => {
	const { t } = useTranslation("receipts");
	const { currencyCode, items } = useReceiptContext();
	const locale = useLocale();
	const emptyItems = items.filter((item) => item.consumers.length === 0);
	const onEmptyItemClick = React.useCallback(
		(id: ReceiptItemId) => {
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
			<Text variant="h4">{t("item.noParticipantsItemsSection.label")}</Text>
			{emptyItems.map((item) => (
				<Checkbox
					key={item.id}
					color="warning"
					isSelected
					onValueChange={() => onEmptyItemClick(item.id)}
					icon={<Icon name="arrow-down" className="text-foreground size-4" />}
				>
					{t("item.noParticipantsItemsSection.itemLabel", {
						name: item.name,
						amount: formatCurrency(
							locale,
							currencyCode,
							round(item.quantity * item.price),
						),
					})}
				</Checkbox>
			))}
		</View>
	);
};
