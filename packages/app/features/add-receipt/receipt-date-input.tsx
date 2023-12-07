import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { DateInput } from "app/components/date-input";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({ form, isLoading }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("issued", date),
		[form],
	);
	return (
		<DateInput
			label="Issued on"
			timestamp={form.getValues("issued")}
			isDisabled={isLoading}
			onUpdate={onDateUpdate}
			updateOnChange
		/>
	);
};
