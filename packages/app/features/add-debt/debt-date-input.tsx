import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { DateInput } from "app/components/date-input";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const DebtDateInput: React.FC<Props> = ({ form, isLoading }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("timestamp", date),
		[form],
	);
	return (
		<DateInput
			timestamp={form.getValues("timestamp")}
			isLoading={isLoading}
			onUpdate={onDateUpdate}
			updateOnChange
		/>
	);
};
