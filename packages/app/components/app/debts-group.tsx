import React from "react";
import { View } from "react-native";

import { tv } from "@nextui-org/react";

import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import { round } from "~app/utils/math";
import { Text } from "~components";

const debt = tv({
	variants: {
		direction: {
			out: "text-danger",
			in: "text-success",
		},
	},
});

type DebtElement = { currencyCode: CurrencyCode; sum: number };

const DebtGroupElement: React.FC<DebtElement> = ({ currencyCode, sum }) => {
	const currency = useFormattedCurrency(currencyCode);
	return (
		<Text
			numberOfLines={1}
			key={currencyCode}
			testID="debts-group-element"
			className={debt({ direction: sum >= 0 ? "in" : "out" })}
		>
			{round(Math.abs(sum))} {currency}
		</Text>
	);
};

const debtGroup = tv({
	base: "shrink flex-row flex-wrap items-center justify-center gap-2",
});

type Props = {
	debts: DebtElement[];
} & React.ComponentProps<typeof View>;

export const DebtsGroup: React.FC<Props> = ({ debts, className, ...props }) => (
	<View className={debtGroup({ className })} testID="debts-group" {...props}>
		{debts.map(({ currencyCode, sum }, index) => (
			<React.Fragment key={currencyCode}>
				{index === 0 ? null : <Text>•</Text>}
				<DebtGroupElement currencyCode={currencyCode} sum={sum} />
			</React.Fragment>
		))}
		{debts.length === 0 ? "No debts yet" : null}
	</View>
);
