import React from "react";

import type { ViewReactNode } from "~components/view";

export type Props = Pick<React.ComponentProps<"form">, "className" | "id"> & {
	onSubmit?: () => void;
	testID?: string;
	children: ViewReactNode;
};

export const Form: React.FC<Props> = ({
	className,
	onSubmit: onSubmitRaw,
	id,
	testID,
	children,
}) => {
	const onSubmit = React.useCallback<React.SubmitEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			onSubmitRaw?.();
		},
		[onSubmitRaw],
	);
	return (
		<form
			className={className}
			onSubmit={onSubmit}
			id={id}
			data-testid={testID}
		>
			{children}
		</form>
	);
};
