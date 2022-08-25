import React from "react";

import { Input, Text } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { z } from "zod";

import { Calendar } from "app/components/calendar";
import { IconButton } from "app/components/icon-button";
import { useSingleInput } from "app/hooks/use-single-input";
import { TRPCError } from "app/trpc";
import { formatDate } from "app/utils/date";
import { noop } from "app/utils/utils";

type Props = {
	timestamp: Date;
	error?: TRPCError | null;
	loading?: boolean;
	disabled?: boolean;
	label?: string;
	onUpdate: (nextDate: Date) => void;
	updateOnChange?: boolean;
};

export const DateInput: React.FC<Props> = ({
	timestamp,
	error,
	loading,
	disabled,
	label,
	onUpdate,
	updateOnChange,
}) => {
	const { bindings, state, getValue, setValue, form } = useSingleInput({
		type: "date",
		initialValue: timestamp,
		schema: z.date(),
	});
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
			disabled={loading || disabled}
		>
			{disabled ? (
				<Text size="$xl">{formatDate(dateValue)}</Text>
			) : (
				<Input
					{...bindings}
					onChange={noop}
					value={formatDate(dateValue)}
					aria-label={label || "Date"}
					label={label}
					disabled={loading}
					status={state.error ? "warning" : undefined}
					helperColor={state.error ? "warning" : "error"}
					helperText={state.error?.message || error?.message}
					contentRightStyling
					contentRight={
						updateOnChange ? null : (
							<IconButton
								title="Save date"
								light
								isLoading={loading}
								disabled={Boolean(state.error)}
								onClick={() => onUpdate(dateValue)}
								color={
									dateValue.valueOf() === timestamp.valueOf()
										? undefined
										: "warning"
								}
								icon={<CheckMark size={24} />}
							/>
						)
					}
				/>
			)}
		</Calendar>
	);
};
