import React from "react";

import type { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import type { currencyCodeSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import {
	type MutationOrMutations,
	useMutationLoading,
} from "~components/utils";

type Props = {
	mutation?: MutationOrMutations;
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

	const formattedCurrency = useFormattedCurrency(value ?? "");
	const isMutationLoading = useMutationLoading({ mutation });

	return (
		<>
			{value ? (
				<Input
					value={
						formattedCurrency.code === formattedCurrency.name
							? formattedCurrency.code
							: `${formattedCurrency.name} (${formattedCurrency.code})`
					}
					onChange={(e) => onValueChange(e.currentTarget.value)}
					label="Currency"
					name="currency"
					mutation={mutation}
					isReadOnly
					onClick={openModal}
				/>
			) : (
				<Button
					color="primary"
					onPress={openModal}
					isDisabled={isMutationLoading}
					className="self-end"
				>
					Pick currency
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
