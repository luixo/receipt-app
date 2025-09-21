import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useLocale } from "~app/hooks/use-locale";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Button, ButtonGroup } from "~components/button";
import { Skeleton } from "~components/skeleton";
import type { UserId } from "~db/ids";

type ButtonProps = {
	selected: boolean;
	currencyCode: CurrencyCode;
	setSelectedCurrencyCode: (currencyCode: CurrencyCode) => void;
};

const CurrencyButton: React.FC<ButtonProps> = ({
	selected,
	currencyCode,
	setSelectedCurrencyCode,
}) => {
	const select = React.useCallback(() => {
		setSelectedCurrencyCode(currencyCode);
	}, [setSelectedCurrencyCode, currencyCode]);
	const locale = useLocale();
	return (
		<Button variant={selected ? undefined : "ghost"} onPress={select}>
			{getCurrencySymbol(locale, currencyCode)}
		</Button>
	);
};

type Props = {
	selectedCurrencyCode?: CurrencyCode;
	onSelectOther: () => void;
	userId: UserId;
} & Pick<ButtonProps, "setSelectedCurrencyCode">;

export const CurrenciesGroup = suspendedFallback<Props>(
	({
		selectedCurrencyCode,
		setSelectedCurrencyCode,
		onSelectOther,
		userId,
	}) => {
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
		const isSelectedOther =
			selectedCurrencyCode !== undefined &&
			!nonResolvedDebts.some(
				(debt) => debt.currencyCode === selectedCurrencyCode,
			);
		const locale = useLocale();
		return (
			<ButtonGroup color="primary" className="flex-wrap">
				{nonResolvedDebts.map((debt) => (
					<CurrencyButton
						key={debt.currencyCode}
						selected={selectedCurrencyCode === debt.currencyCode}
						currencyCode={debt.currencyCode}
						setSelectedCurrencyCode={setSelectedCurrencyCode}
					/>
				))}
				<Button
					variant={isSelectedOther ? undefined : "ghost"}
					onPress={onSelectOther}
				>
					{isSelectedOther
						? getCurrencySymbol(locale, selectedCurrencyCode)
						: "Other"}
				</Button>
			</ButtonGroup>
		);
	},
	<ButtonGroup color="primary" className="flex-wrap">
		{Array.from({ length: 3 }).map((_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<Button key={index} variant="ghost">
				<Skeleton className="h-6 w-12 rounded-md" />
			</Button>
		))}
	</ButtonGroup>,
);
