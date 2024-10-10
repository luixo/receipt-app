import React from "react";

import type { Path, PathValue, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import type { currencyCodeSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";

type MinimalForm = {
	currencyCode: z.infer<typeof currencyCodeSchema>;
};

type Props<T extends MinimalForm> = {
	form: UseFormReturn<T>;
	isLoading: boolean;
	topCurrenciesQuery: React.ComponentProps<
		typeof CurrenciesPicker
	>["topCurrenciesQuery"];
};

export const CurrencyInput = <T extends MinimalForm>({
	form,
	isLoading,
	topCurrenciesQuery,
}: Props<T>) => {
	const [
		modalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();

	const onCurrencyChange = React.useCallback(
		(nextCurrencyCode: z.infer<typeof currencyCodeSchema>) => {
			closeModal();
			form.setValue(
				"currencyCode" as Path<T>,
				nextCurrencyCode as PathValue<T, Path<T>>,
				{ shouldValidate: true },
			);
		},
		[form, closeModal],
	);

	const selectedCurrencyCode = form.watch(
		"currencyCode" as Path<T> & "currencyCode",
	);

	const onLoad = React.useCallback(
		(
			currencyCodes: z.infer<typeof currencyCodeSchema>[],
			topCurrencyCodes: CurrencyCode[],
		) => {
			if (!selectedCurrencyCode) {
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
		[onCurrencyChange, selectedCurrencyCode],
	);

	const formattedCurrency = useFormattedCurrency(selectedCurrencyCode);

	return (
		<>
			{selectedCurrencyCode ? (
				<Input
					value={
						formattedCurrency.code === formattedCurrency.name
							? formattedCurrency.code
							: `${formattedCurrency.name} (${formattedCurrency.code})`
					}
					label="Currency"
					isDisabled={isLoading}
					isReadOnly
					onClick={openModal}
					className={isLoading ? undefined : "cursor-pointer"}
				/>
			) : (
				<Button
					color="primary"
					onClick={openModal}
					isDisabled={isLoading}
					className="self-end"
				>
					Pick currency
				</Button>
			)}
			<CurrenciesPicker
				selectedCurrencyCode={selectedCurrencyCode}
				onChange={onCurrencyChange}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				onLoad={onLoad}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
		</>
	);
};
