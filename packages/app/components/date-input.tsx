import React from "react";

import { Button, Input } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { z } from "zod";

import { Text } from "app/components/base/text";
import { Calendar } from "app/components/calendar";
import { useSingleInput } from "app/hooks/use-single-input";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import type { TRPCError } from "app/trpc";

type Props = {
	timestamp: Date;
	error?: TRPCError | null;
	isLoading?: boolean;
	isDisabled?: boolean;
	label?: string;
	onUpdate: (nextDate: Date) => void;
	updateOnChange?: boolean;
};

export const DateInput: React.FC<Props> = ({
	timestamp,
	error,
	isLoading: loading,
	isDisabled,
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
			disabled={loading || isDisabled}
		>
			{isDisabled ? (
				<Text className="text-xl">{formatDate(dateValue)}</Text>
			) : (
				<Input
					{...bindings}
					value={formatDate(dateValue)}
					aria-label={label || "Date"}
					label={label}
					labelPlacement="outside"
					isDisabled={loading}
					isInvalid={Boolean(state.error)}
					errorMessage={state.error?.message || error?.message}
					endContent={
						updateOnChange ? (
							// Bug: https://github.com/nextui-org/nextui/issues/2069
							<div />
						) : (
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
