import type React from "react";
import { View } from "react-native";

import { useFormat } from "~app/hooks/use-format";
import { Calendar } from "~components/calendar";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import type { MutationsProp } from "~components/utils";
import { useMutationLoading } from "~components/utils";

type Props = {
	value: Date | undefined;
	onValueChange: (date: Date) => void;
	mutation?: MutationsProp;
	label?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onValueChange">;

export const DateInput: React.FC<Props> = ({
	value,
	onValueChange,
	mutation,
	label,
	...props
}) => {
	const { formatDate } = useFormat();
	return (
		<Calendar
			value={value}
			onChange={onValueChange}
			disabled={useMutationLoading({ mutation }) || props.isDisabled}
		>
			<View>
				<Input
					value={value ? formatDate(value) : ""}
					aria-label={label || "Date"}
					label={label}
					mutation={mutation}
					type="text"
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
