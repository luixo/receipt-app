import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { useFormat } from "~app/hooks/use-format";
import { Calendar } from "~components/calendar";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import type { MutationsProp } from "~components/utils";
import { getMutationLoading } from "~components/utils";
import { type Temporal, parsers } from "~utils/date";

type Props = {
	value: Temporal.PlainDate | undefined;
	onValueChange: (date: Temporal.PlainDate) => void;
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
	const { t } = useTranslation("default");
	const { formatPlainDate } = useFormat();
	return (
		<Calendar
			value={value}
			onChange={(nextValue) => onValueChange(nextValue)}
			disabled={getMutationLoading(mutation) || props.isDisabled}
		>
			<View>
				<Input
					value={value ? formatPlainDate(value, { timeZone: "GMT" }) : ""}
					onValueChange={(nextValue) => {
						// Manual update - or by automation tool
						const updatedDate = parsers.plainDate(
							nextValue as Parameters<typeof parsers.plainDate>[0],
						);
						if (Number.isNaN(updatedDate.value)) {
							return;
						}
						onValueChange(updatedDate);
					}}
					aria-label={label || t("components.dateInput.label")}
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
> = ({ label, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<View>
			<Input
				startContent={<Spinner size="sm" />}
				aria-label={label || t("components.dateInput.label")}
				label={label}
				type="text"
				isDisabled
				{...props}
			/>
		</View>
	);
};
