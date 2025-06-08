import React from "react";

import type { z } from "zod/v4";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useCurrencyDescription } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import type { currencyCodeSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { type MutationsProp, getMutationLoading } from "~components/utils";

type InnerProps = {
	value: CurrencyCode;
	onValueChange: (currencyCode: CurrencyCode) => void;
	mutation?: MutationsProp;
	onClick: () => void;
} & Omit<
	React.ComponentProps<typeof Input>,
	"value" | "onChange" | "onValueChange"
>;

const InnerInput: React.FC<InnerProps> = ({
	value,
	onValueChange,
	...props
}) => {
	const currencyDescription = useCurrencyDescription(value);
	return (
		<Input
			value={currencyDescription}
			onChange={(e) => onValueChange(e.currentTarget.value)}
			{...props}
		/>
	);
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

	return (
		<>
			{value ? (
				<InnerInput
					value={value}
					onValueChange={onValueChange}
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
					isDisabled={getMutationLoading(mutation)}
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
