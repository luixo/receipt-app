import React from "react";

export type Props = React.PropsWithChildren<
	Pick<React.ComponentProps<"form">, "className" | "id"> & {
		onSubmit?: () => void;
	}
>;

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
