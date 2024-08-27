import React from "react";
import { View } from "react-native";

import { groupBy, values } from "remeda";

import { GroupedQueryErrorMessage } from "~app/components/error-message";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { TRPCQueryErrorResult } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { tv } from "~components/utils";
import { round } from "~utils/math";

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
	isLoading?: boolean;
	errorQueries?: TRPCQueryErrorResult<"debts.get">[];
} & React.ComponentProps<typeof View>;

export const DebtsGroup: React.FC<Props> = ({
	debts,
	className,
	isLoading,
	errorQueries,
	...props
}) => (
	<View className={debtGroup({ className })} testID="debts-group" {...props}>
		{isLoading ? <Spinner /> : null}
		{errorQueries
			? values(groupBy(errorQueries, (query) => query.error.message)).map(
					(queries) => (
						<GroupedQueryErrorMessage
							key={queries[0].error.message}
							queries={queries}
						/>
					),
			  )
			: null}
		{debts.map(({ currencyCode, sum }, index) => (
			<React.Fragment key={currencyCode}>
				{index === 0 ? null : <Text>•</Text>}
				<DebtGroupElement currencyCode={currencyCode} sum={sum} />
			</React.Fragment>
		))}
		{debts.length === 0 && !isLoading ? <Text>No debts yet</Text> : null}
	</View>
);
