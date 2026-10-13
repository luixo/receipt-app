import type React from "react";

import { Calendar, Popover } from "@heroui/react";
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
	const [open, { setTrue: setOpen, setFalse: setClose }] =
		useBooleanState(false);
	const isDisabled = getMutationLoading(mutation);
	return (
		<Popover
			isOpen={open}
			onOpenChange={(nextOpen) =>
				nextOpen && !isDisabled ? setOpen() : setClose()
			}
		>
			<Popover.Trigger>
				<div>
					<Input
						value={value ? formatPlainDate(value) : ""}
						onValueChange={(nextValue) => {
							// Manual update - or by automation tool
							onValueChange(Temporal.PlainDate.from(nextValue));
						}}
						isReadOnly={import.meta.env.MODE !== "test"}
						label={label || t("components.dateInput.label")}
						hideLabel
						mutation={mutation}
						type="text"
						{...props}
					/>
				</div>
			</Popover.Trigger>
			<Popover.Content className="overflow-scroll">
				<Popover.Dialog aria-label={label || t("components.dateInput.label")}>
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
						value={
							value && new CalendarDate(value.year, value.month, value.day)
						}
						isDisabled={isDisabled}
					>
						<Calendar.Header className="gap-2">
							<Calendar.NavButton slot="previous" />
							<Calendar.Heading />
							<Calendar.NavButton slot="next" />
						</Calendar.Header>
						<Calendar.Grid>
							<Calendar.GridHeader>
								{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
							</Calendar.GridHeader>
							<Calendar.GridBody>
								{(date) => <Calendar.Cell date={date} />}
							</Calendar.GridBody>
						</Calendar.Grid>
					</Calendar>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	);
};
