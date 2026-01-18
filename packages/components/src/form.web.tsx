import React from "react";

import type { ViewReactNode } from "~components/view";

export type Props = Pick<React.ComponentProps<"form">, "className" | "id"> & {
	onSubmit?: () => void;
	children: ViewReactNode;
};

export const Form: React.FC<Props> = ({
	className,
	onSubmit: onSubmitRaw,
	id,
	children,
}) => {
	const onSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			onSubmitRaw?.();
		},
		[onSubmitRaw],
	);
	return (
		<form className={className} onSubmit={onSubmit} id={id}>
			{children}
		</form>
	);
};
