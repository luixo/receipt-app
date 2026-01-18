import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { useLocale } from "~app/hooks/use-locale";
import { type CurrencyCode, formatCurrency } from "~app/utils/currency";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { round } from "~utils/math";

const DebtGroupElementSkeleton = () => (
	<Skeleton className="h-6 w-20 rounded" data-testid="debt-group-element" />
);

type DebtElement = { currencyCode: CurrencyCode; sum: number };

const DebtGroupElement: React.FC<DebtElement> = ({ currencyCode, sum }) => {
	const locale = useLocale();
	return (
		<Text
			key={currencyCode}
			testID="debts-group-element"
			className={cn("line-clamp-1", sum >= 0 ? "text-success" : "text-danger")}
		>
			{formatCurrency(locale, currencyCode, round(Math.abs(sum)))}
		</Text>
	);
};

const SeparatedDebts: React.FC<{ children: React.ReactNode[] }> = ({
	children,
}) => (
	<>
		{children.map((child, index) =>
			child ? (
				<React.Fragment
					key={typeof child === "object" && "key" in child ? child.key : null}
				>
					{index === 0 ? null : <Text>•</Text>}
					{child}
				</React.Fragment>
			) : null,
		)}
	</>
);

export const DebtsGroupSkeleton: React.FC<{
	amount: number;
	className?: string;
}> = ({ amount, className }) => {
	const elements = React.useMemo(
		() => new Array<null>(amount).fill(null),
		[amount],
	);
	return (
		<View
			className={cn(
				"shrink flex-row flex-wrap items-center justify-center gap-2",
				className,
			)}
		>
			<SeparatedDebts>
				{elements.map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<DebtGroupElementSkeleton key={index} />
				))}
			</SeparatedDebts>
		</View>
	);
};

type Props = {
	debts: DebtElement[];
} & React.ComponentProps<typeof View>;

export const DebtsGroup: React.FC<Props> = ({ debts, className, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<View
			className={cn(
				"shrink flex-row flex-wrap items-center justify-center gap-2",
				className,
			)}
			testID="debts-group"
			{...props}
		>
			<SeparatedDebts>
				{debts.map(({ currencyCode, sum }) => (
					<DebtGroupElement
						key={currencyCode}
						currencyCode={currencyCode}
						sum={sum}
					/>
				))}
			</SeparatedDebts>
			{debts.length === 0 ? (
				<Text>{t("components.debtsGroup.noDebtsYet")}</Text>
			) : null}
		</View>
	);
};
