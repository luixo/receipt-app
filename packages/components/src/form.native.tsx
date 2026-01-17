import React from "react";
import { View } from "react-native";

import type { Props } from "./form";

export const formHandlersById: Partial<Record<string, () => void>> = {};

type FormContextType = {
	submitHandler: () => void;
};
export const FormContext = React.createContext<FormContextType>({
	submitHandler: () => {},
});

export const Form: React.FC<Props> = ({
	className,
	children,
	onSubmit,
	id,
}) => {
	const parentContext = React.use(FormContext);
	const context = React.useMemo(() => {
		if (onSubmit) {
			return { submitHandler: onSubmit };
		}
		return parentContext;
	}, [onSubmit, parentContext]);
	React.useEffect(() => {
		if (id && onSubmit) {
			formHandlersById[id] = onSubmit;
		}
		return () => {
			if (id) {
				formHandlersById[id] = undefined;
			}
		};
	}, [id, onSubmit]);
	return (
		<FormContext value={context}>
			<View className={className}>{children}</View>
		</FormContext>
	);
};
