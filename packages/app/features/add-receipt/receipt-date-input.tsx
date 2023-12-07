import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { DateInput } from "app/components/date-input";
import type { TRPCMutationResult } from "app/trpc";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"receipts.add">;
};

export const ReceiptDateInput: React.FC<Props> = ({ form, query }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("issued", date),
		[form],
	);
	return (
		<DateInput
			label="Issued on"
			timestamp={form.getValues("issued")}
			isLoading={query.isLoading}
			onUpdate={onDateUpdate}
			updateOnChange
		/>
	);
};
