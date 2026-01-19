import React from "react";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { getCurrencyDescription } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import type { currencyCodeSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import { type MutationsProp, getMutationLoading } from "~components/utils";

export const SkeletonCurrencyInput = () => {
	const { t } = useTranslation("default");
	return <SkeletonInput label={t("components.currencyInput.currency")} />;
};

const useAutoLoadCurrency = (
	topQueryOptions: React.ComponentProps<
		typeof CurrenciesPicker
	>["topQueryOptions"],
	onLoad: (
		currencyCodes: CurrencyCode[],
		topCurrencyCodes: CurrencyCode[],
	) => void,
) => {
	const trpc = useTRPC();
	const currenciesQuery = useQuery(trpc.currency.getList.queryOptions());
	const topCurrenciesQuery = useQuery(
		trpc.currency.top.queryOptions({
			options: topQueryOptions,
		}),
	);
	React.useEffect(() => {
		if (currenciesQuery.data && topCurrenciesQuery.data) {
			onLoad(
				currenciesQuery.data,
				topCurrenciesQuery.data.map(({ currencyCode }) => currencyCode),
			);
		}
	}, [currenciesQuery.data, topCurrenciesQuery.data, onLoad]);
};

type Props = {
	mutation?: MutationsProp;
	topQueryOptions: React.ComponentProps<
		typeof CurrenciesPicker
	>["topQueryOptions"];
	value: CurrencyCode | undefined;
	onValueChange: (currencyCode: CurrencyCode) => void;
};

export const CurrencyInput: React.FC<Props> = ({
	mutation,
	topQueryOptions,
	value,
	onValueChange,
}) => {
	const locale = useLocale();
	const { t } = useTranslation("default");
	const [
		modalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();

	const onCurrencyChange = React.useCallback(
		(nextCurrencyCode: z.infer<typeof currencyCodeSchema>) => {
			closeModal();
			onValueChange(nextCurrencyCode);
		},
		[closeModal, onValueChange],
	);

	const onLoad = React.useCallback(
		(
			currencyCodes: z.infer<typeof currencyCodeSchema>[],
			topCurrencyCodes: CurrencyCode[],
		) => {
			if (!value) {
				const matchedTopCurrencyCode = topCurrencyCodes
					.map((topCurrencyCode) =>
						currencyCodes.find(
							(currencyCode) => currencyCode === topCurrencyCode,
						),
					)
					.find(Boolean);
				const nextSelectedCurrencyCode =
					matchedTopCurrencyCode || currencyCodes[0];
				if (nextSelectedCurrencyCode) {
					onCurrencyChange(nextSelectedCurrencyCode);
				}
			}
		},
		[onCurrencyChange, value],
	);
	useAutoLoadCurrency(topQueryOptions, onLoad);

	return (
		<>
			{value ? (
				<Input
					value={getCurrencyDescription(locale, value)}
					onValueChange={onValueChange}
					label={t("components.currencyInput.currency")}
					name="currency"
					mutation={mutation}
					isReadOnly
					onPress={openModal}
				/>
			) : (
				<Button
					color="primary"
					onPress={openModal}
					isDisabled={getMutationLoading(mutation)}
					className="self-end"
				>
					{t("components.currencyInput.pickButton")}
				</Button>
			)}
			<CurrenciesPicker
				selectedCurrencyCode={value}
				onChange={onCurrencyChange}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				onLoad={onLoad}
				topQueryOptions={topQueryOptions}
			/>
		</>
	);
};
