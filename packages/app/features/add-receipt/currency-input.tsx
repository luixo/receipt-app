import React from "react";

import { Button, Input, Spacer } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";
import { MdEdit as EditIcon } from "react-icons/md";

import { CurrenciesPicker } from "app/components/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { TRPCMutationResult, TRPCQueryOutput } from "app/trpc";

import { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"receipts.put">;
};

export const CurrencyInput: React.FC<Props> = ({ form, query }) => {
	const [selectedCurrency, setSelectedCurrency] = React.useState<
		TRPCQueryOutput<"currency.get-list">[number] | undefined
	>();
	React.useEffect(() => {
		if (!selectedCurrency) {
			form.resetField("currency");
		} else {
			form.setValue("currency", selectedCurrency?.code, {
				shouldValidate: true,
			});
		}
	}, [selectedCurrency, form]);

	const [currencyModalOpen, setCurrencyModalOpen] = React.useState(false);
	const switchCurrencyModal = React.useCallback(
		() => setCurrencyModalOpen((prev) => !prev),
		[setCurrencyModalOpen]
	);

	return (
		<>
			{selectedCurrency ? (
				<>
					<Input
						value={`${selectedCurrency.name} (${selectedCurrency.code})`}
						label="Currency"
						disabled={query.isLoading}
						contentRightStyling={false}
						readOnly
						contentRight={
							<IconButton light auto onClick={switchCurrencyModal}>
								<EditIcon size={24} />
							</IconButton>
						}
					/>
					<Spacer y={0.5} />
				</>
			) : (
				<Button
					onClick={switchCurrencyModal}
					disabled={query.isLoading}
					css={{ alignSelf: "flex-end" }}
				>
					Pick currency
				</Button>
			)}
			<CurrenciesPicker
				selectedCurrency={selectedCurrency}
				onChange={setSelectedCurrency}
				modalOpen={currencyModalOpen}
				onModalClose={switchCurrencyModal}
			/>
		</>
	);
};
