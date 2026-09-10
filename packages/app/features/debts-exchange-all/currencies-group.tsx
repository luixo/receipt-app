import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useLocale } from "~app/hooks/use-locale";
import { getCurrencySymbol } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Button, ButtonGroup } from "~components/button";
import { Skeleton } from "~components/skeleton";
import type { UserId } from "~db/ids";

type Props = {
	selectedCurrencyCode?: CurrencyCode;
	onSelectOther: () => void;
	userId: UserId;
	setSelectedCurrencyCode: (currencyCode: CurrencyCode) => void;
};

export const CurrenciesGroup = suspendedFallback<Props>(
	({
		selectedCurrencyCode,
		setSelectedCurrencyCode,
		onSelectOther,
		userId,
	}) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const nonResolvedDebts = debts.items.filter((element) => element.sum !== 0);
		const isSelectedOther =
			selectedCurrencyCode !== undefined &&
			!nonResolvedDebts.some(
				(debt) => debt.currencyCode === selectedCurrencyCode,
			);
		const locale = useLocale();
		return (
			<ButtonGroup
				color="primary"
				className="flex-wrap"
				testID="currencies-group"
			>
				{nonResolvedDebts.map((debt) => (
					<Button
						key={debt.currencyCode}
						variant={
							selectedCurrencyCode === debt.currencyCode ? undefined : "ghost"
						}
						onPress={() => setSelectedCurrencyCode(debt.currencyCode)}
						testID="currency-button"
					>
						{getCurrencySymbol(locale, debt.currencyCode)}
					</Button>
				))}
				<Button
					variant={isSelectedOther ? undefined : "ghost"}
					onPress={onSelectOther}
					testID="currency-button"
				>
					{isSelectedOther
						? getCurrencySymbol(locale, selectedCurrencyCode)
						: t("exchange.otherButton")}
				</Button>
			</ButtonGroup>
		);
	},
	<ButtonGroup
		color="primary"
		className="flex-wrap"
		testID="currencies-group-skeleton"
	>
		{Array.from({ length: 3 }).map((_, index) => (
			// oxlint-disable-next-line react/no-array-index-key
			<Button key={index} variant="ghost">
				<Skeleton className="h-6 w-12 rounded-md" />
			</Button>
		))}
	</ButtonGroup>,
);
