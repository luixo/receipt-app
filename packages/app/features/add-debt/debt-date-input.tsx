import React from "react";

import { styled } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

import { DateInput } from "app/components/date-input";

import type { Form } from "./types";

const Wrapper = styled("div", {
	display: "flex",
	gap: "$6",
	alignItems: "center",
});

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
		<Wrapper>
			<DateInput
				timestamp={form.getValues("timestamp")}
				loading={isLoading}
				onUpdate={onDateUpdate}
				updateOnChange
			/>
		</Wrapper>
	);
};
