import React from "react";
import { Button as ButtonRaw, View } from "react-native";

import { omit } from "remeda";

import type { ButtonGroupProps, ButtonProps } from "./button";
import { FormContext, formHandlersById } from "./form.native";

export const Button: React.FC<ButtonProps> = ({
	children,
	onClick: onClickRaw,
	type,
	form,
	...props
}) => {
	const formContext = React.use(FormContext);
	const onClick = React.useCallback(() => {
		if (type === "submit") {
			if (form) {
				formHandlersById[form]?.();
			} else {
				formContext.submitHandler();
			}
		}
		onClickRaw?.();
	}, [onClickRaw, formContext, type, form]);
	return (
		<ButtonRaw
			{...omit(props, ["ref"])}
			title={String(children)}
			onPress={onClick}
		/>
	);
};

export const ButtonGroup: React.FC<ButtonGroupProps> = (props) => (
	<View {...(props as React.ComponentProps<typeof View>)} />
);
