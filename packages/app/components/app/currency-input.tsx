import React from "react";

import { Button, Input } from "@nextui-org/react";
import type { Path, PathValue, UseFormReturn } from "react-hook-form";
import { MdEdit as EditIcon } from "react-icons/md";
import type { z } from "zod";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import type { CurrencyCode } from "app/utils/currency";
import type { currencySchema } from "app/utils/validation";

type MinimalForm = {
	currency: z.infer<typeof currencySchema>;
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
	const [modalOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();

	const onCurrencyChange = React.useCallback(
		(nextCurrency: z.infer<typeof currencySchema>) => {
			closeModal();
			form.setValue(
				"currency" as Path<T>,
				nextCurrency as PathValue<T, Path<T>>,
				{ shouldValidate: true },
			);
		},
		[form, closeModal],
	);

	const selectedCurrency = form.watch("currency" as Path<T> & "currency");

	const onLoad = React.useCallback(
		(
			currencies: z.infer<typeof currencySchema>[],
			topCurrencyCodes: CurrencyCode[],
		) => {
			if (!selectedCurrency) {
				const matchedTopCurrencyCode = topCurrencyCodes
					.map((topCurrencyCode) =>
						currencies.find((currency) => currency.code === topCurrencyCode),
					)
					.find(Boolean);
				const nextSelectedCurrency = matchedTopCurrencyCode || currencies[0];
				if (nextSelectedCurrency) {
					onCurrencyChange(nextSelectedCurrency);
				}
			}
		},
		[onCurrencyChange, selectedCurrency],
	);

	return (
		<>
			{selectedCurrency ? (
				<Input
					value={`${selectedCurrency.name} (${selectedCurrency.code})`}
					label="Currency"
					disabled={isLoading}
					contentRightStyling={false}
					readOnly
					onClick={openModal}
					contentRight={
						<IconButton light auto onClick={openModal}>
							<EditIcon size={24} />
						</IconButton>
					}
				/>
			) : (
				<Button
					onClick={openModal}
					disabled={isLoading}
					css={{ alignSelf: "flex-end" }}
				>
					Pick currency
				</Button>
			)}
			<CurrenciesPicker
				selectedCurrency={selectedCurrency}
				onChange={onCurrencyChange}
				modalOpen={modalOpen}
				onModalClose={closeModal}
				onLoad={onLoad}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
		</>
	);
};
