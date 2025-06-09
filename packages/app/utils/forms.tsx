import React from "react";

import type { FormState } from "@tanstack/react-form";
import {
	createFormHook,
	createFormHookContexts,
	useStore,
} from "@tanstack/react-form";
import type { Derived } from "@tanstack/react-store";

import { Input } from "~components/input";
import { NumberInput } from "~components/number-input";

const { useFormContext, fieldContext, formContext } = createFormHookContexts();

const Form: React.FC<React.ComponentProps<"form">> = ({
	onSubmit: onSubmitRaw,
	...props
}) => {
	const form = useFormContext();
	const onSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			void form.handleSubmit();
			onSubmitRaw?.(e);
		},
		[form, onSubmitRaw],
	);
	return <form {...props} onSubmit={onSubmit} />;
};

export const { useAppForm, withForm } = createFormHook({
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
	formStore: Derived<
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		FormState<Form, any, any, any, any, any, any, any, any>
	>,
	// This is only needed for types
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_defaultValues: DefaultValues,
) => {
	const formValues = useStore(formStore, (store) => store.values);
	return formValues as Partial<Form> & DefaultValues;
};
