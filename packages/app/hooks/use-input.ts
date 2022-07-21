import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useController } from "react-hook-form";
import { z } from "zod";

type Form = {
	value: string;
};

type Options = {
	initialValue?: string;
	schema: z.ZodString;
};

export const useInput = ({ initialValue, schema }: Options) => {
	const { control, watch, setValue } = useForm<Form>({
		mode: "onChange",
		defaultValues: {
			value: initialValue,
		},
		resolver: zodResolver(schema),
	});
	const { field, fieldState } = useController({
		name: "value",
		control,
	});
	const setInputValue = React.useCallback(
		(nextValue: string) => setValue("value", nextValue),
		[setValue]
	);
	return {
		bindings: field,
		state: fieldState,
		value: watch("value"),
		setValue: setInputValue,
	};
};
