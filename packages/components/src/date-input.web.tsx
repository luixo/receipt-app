import type React from "react";

import { Calendar } from "@heroui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { CalendarDate } from "@internationalized/date";
import { useTranslation } from "react-i18next";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormat } from "~app/hooks/use-format";
import { Input } from "~components/input";
import type { MutationsProp } from "~components/utils";
import { getMutationLoading } from "~components/utils";

export type Props = {
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
	const [open, { switchValue: switchOpen, setFalse: setClose }] =
		useBooleanState(false);
	const isDisabled = getMutationLoading(mutation);
	return (
		<Popover
			isOpen={open}
			onOpenChange={switchOpen}
			isTriggerDisabled={isDisabled}
		>
			<PopoverTrigger>
				<div>
					<Input
						value={value ? formatPlainDate(value) : ""}
						onValueChange={(nextValue) => {
							// Manual update - or by automation tool
							onValueChange(Temporal.PlainDate.from(nextValue));
						}}
						isReadOnly={import.meta.env.MODE !== "test"}
						label={label || t("components.dateInput.label")}
						mutation={mutation}
						type="text"
						{...props}
					/>
				</div>
			</PopoverTrigger>
			<PopoverContent className="border-foreground border-2 p-0 shadow-md">
				<Calendar<CalendarDate>
					onChange={(nextValue: CalendarDate) => {
						onValueChange(
							Temporal.PlainDate.from({
								year: nextValue.year,
								month: nextValue.month,
								day: nextValue.day,
							}),
						);
						setClose();
					}}
					showMonthAndYearPickers
					value={value && new CalendarDate(value.year, value.month, value.day)}
					isDisabled={isDisabled}
				/>
			</PopoverContent>
		</Popover>
	);
};
