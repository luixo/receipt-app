import React from "react";

import { Loading, Text, styled } from "@nextui-org/react";
import { UseMutationResult } from "react-query";

import { Calendar } from "app/components/calendar";
import { MutationErrorMessage } from "app/components/error-message";
import { TRPCError } from "app/trpc";

const DateText = styled(Text, {
	fontSize: "$sm",

	variants: {
		disabled: {
			false: {
				cursor: "pointer",
			},
		},
	},
});

type Props = {
	mutation: UseMutationResult<any, TRPCError, any, any>;
	timestamp: Date;
	disabled?: boolean;
	onUpdate: (nextDate: Date) => void;
};

export const DateInput: React.FC<Props> = ({
	mutation,
	timestamp,
	disabled,
	onUpdate,
}) => {
	if (mutation.status === "error") {
		return <MutationErrorMessage mutation={mutation} />;
	}
	return (
		<Calendar
			value={timestamp}
			onChange={onUpdate}
			disabled={mutation.isLoading || disabled}
		>
			{mutation.isLoading ? (
				<Loading size="xs" />
			) : (
				// TODO: add formatting
				<DateText
					disabled={mutation.isLoading || disabled}
					css={{ color: "$accents7" }}
				>
					{timestamp.toISOString().slice(0, 10)}
				</DateText>
			)}
		</Calendar>
	);
};
