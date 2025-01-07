import React from "react";
import { View } from "react-native";

import { z } from "zod";

import { useSingleInput } from "~app/hooks/use-single-input";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCMutationResult } from "~app/trpc";
import { Calendar } from "~components/calendar";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";

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
			<View>
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
									onPress: () => onUpdate(dateValue),
							  }
					}
					type="text"
					isDisabled={isDisabled}
					{...props}
				/>
			</View>
		</Calendar>
	);
};

export const SkeletonDateInput: React.FC<
	{ label?: string } & React.ComponentProps<typeof Input>
> = ({ label, ...props }) => (
	<View>
		<Input
			startContent={<Spinner size="sm" />}
			aria-label={label || "Date"}
			label={label}
			type="text"
			isDisabled
			{...props}
		/>
	</View>
);
