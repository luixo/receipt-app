import React from "react";

import type { FormApi } from "@tanstack/react-form";
import {
	createFormHook,
	createFormHookContexts,
	useStore,
} from "@tanstack/react-form";

import { Form as RawForm } from "~components/form";
import { Input } from "~components/input";
import { NumberInput } from "~components/number-input";

const { useFormContext, fieldContext, formContext } = createFormHookContexts();

const Form: React.FC<React.ComponentProps<typeof RawForm>> = ({
	onSubmit: onSubmitRaw,
	...props
}) => {
	const form = useFormContext();
	const onSubmit = React.useCallback(() => {
		void form.handleSubmit();
		onSubmitRaw?.();
	}, [form, onSubmitRaw]);
	return <RawForm {...props} onSubmit={onSubmit} />;
};

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField: Input,
		NumberField: NumberInput,
	},
	formComponents: {
		Form,
	},
	fieldContext,
	formContext,
});

export const useTypedValues = <Form, DefaultValues extends Partial<Form>>(
	formStore: FormApi<
		Form,
		// oxlint-disable typescript/no-explicit-any
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
		// oxlint-enable typescript/no-explicit-any
	>["store"],
	// This is only needed for types
	// oxlint-disable-next-line typescript/no-unused-vars
	_defaultValues: DefaultValues,
) => {
	const formValues = useStore(formStore, (store) => store.values);
	return formValues as Partial<Form> & DefaultValues;
};
