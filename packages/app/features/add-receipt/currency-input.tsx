import React from "react";

import { Button, Input } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";
import { MdEdit as EditIcon } from "react-icons/md";

import { CurrenciesPicker } from "app/components/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { TRPCMutationResult, TRPCQueryOutput } from "app/trpc";

import { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"receipts.put">;
};

export const CurrencyInput: React.FC<Props> = ({ form, query }) => {
	const [modalOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();

	const onCurrencyChange = React.useCallback(
		(nextCurrency: TRPCQueryOutput<"currency.get-list">[number]) => {
			closeModal();
			form.setValue("currency", nextCurrency, { shouldValidate: true });
		},
		[form, closeModal]
	);

	const selectedCurrency = form.watch("currency");
	return (
		<>
			{selectedCurrency ? (
				<Input
					value={`${selectedCurrency.name} (${selectedCurrency.code})`}
					label="Currency"
					disabled={query.isLoading}
					contentRightStyling={false}
					readOnly
					contentRight={
						<IconButton light auto onClick={openModal}>
							<EditIcon size={24} />
						</IconButton>
					}
				/>
			) : (
				<Button
					onClick={openModal}
					disabled={query.isLoading}
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
			/>
		</>
	);
};
