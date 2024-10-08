import React from "react";

import { z } from "zod";

import { useSingleInput } from "~app/hooks/use-single-input";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCMutationResult } from "~app/trpc";
import { Calendar } from "~components/calendar";
import { Input } from "~components/input";
import { Text } from "~components/text";

type Props = {
	timestamp: Date;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mutation?: TRPCMutationResult<any>;
	isDisabled?: boolean;
	label?: string;
	onUpdate: (nextDate: Date) => void;
	updateOnChange?: boolean;
} & React.ComponentProps<typeof Input>;

export const DateInput: React.FC<Props> = ({
	timestamp,
	mutation,
	isDisabled,
	label,
	onUpdate,
	updateOnChange,
	...props
}) => {
	const { formatDate } = useSsrFormat();
	const { bindings, state, getValue, setValue, form } = useSingleInput({
		type: "date",
		initialValue: timestamp,
		schema: z.date(),
	});
	React.useEffect(() => setValue(timestamp), [timestamp, setValue]);
	const value = form.watch("value");
	React.useEffect(() => {
		if (!updateOnChange) {
			return;
		}
		onUpdate(new Date(value));
	}, [updateOnChange, onUpdate, value]);
	// TODO: make getValue() return Date (currently string)
	const dateValue = new Date(getValue());
	return (
		<Calendar
			value={Number.isNaN(dateValue.valueOf()) ? undefined : dateValue}
			onChange={setValue}
			disabled={mutation?.isPending || isDisabled}
		>
			{isDisabled ? (
				<Text className="text-xl">{formatDate(dateValue)}</Text>
			) : (
				<Input
					{...bindings}
					value={formatDate(dateValue)}
					aria-label={label || "Date"}
					label={label}
					mutation={mutation}
					fieldError={state.error}
					saveProps={
						updateOnChange
							? undefined
							: {
									title: "Save date",
									isHidden:
										dateValue.toDateString() === timestamp.toDateString(),
									onClick: () => onUpdate(dateValue),
							  }
					}
					{...props}
				/>
			)}
		</Calendar>
	);
};
