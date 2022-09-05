import React from "react";

import { styled, Text } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";

import { DateInput } from "app/components/date-input";
import { TRPCMutationResult } from "app/trpc";

import { Form } from "./types";

const Wrapper = styled("div", {
	display: "flex",
	gap: "$6",
	alignItems: "center",
});

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"receipts.add">;
};

export const ReceiptDateInput: React.FC<Props> = ({ form, query }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("issued", date),
		[form]
	);
	return (
		<Wrapper>
			<Text>Issued on:</Text>
			<DateInput
				timestamp={form.getValues("issued")}
				loading={query.isLoading}
				onUpdate={onDateUpdate}
				updateOnChange
			/>
		</Wrapper>
	);
};
