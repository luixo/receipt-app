import React from "react";

import { Input, Text } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { z } from "zod";

import { Calendar } from "app/components/calendar";
import { useSingleInput } from "app/hooks/use-single-input";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import type { TRPCError } from "app/trpc";
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
	const isValueSync = dateValue.valueOf() === timestamp.valueOf();
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
					contentRightStyling={false}
					contentRight={
						updateOnChange ? null : (
							<Button
								title="Save date"
								variant="light"
								isLoading={loading}
								isDisabled={Boolean(state.error) || isValueSync}
								onClick={() => onUpdate(dateValue)}
								isIconOnly
								color={isValueSync ? "success" : "warning"}
							>
								<CheckMark size={24} />
							</Button>
						)
					}
				/>
			)}
		</Calendar>
	);
};
