import React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import type { OnSelectHandler } from "react-day-picker";
import { DayPicker } from "react-day-picker";

import { MINUTE } from "~utils/time";

const classNames: NonNullable<DayPickerProps["classNames"]> = {
	root: "flex max-w-full max-h-full bg-background p-4 rounded-large items-center h-80",
	button_previous: "flex p-2",
	button_next: "flex p-2",
	month_caption: "flex flex-row font-medium text-lg gap-2 justify-between px-2",
	months: "flex-1 h-full",
	month: "flex flex-col gap-2 justify-between",
	weekday: "px-2",
	nav: "flex gap-2 justify-end",
	day_button: "px-3 py-2 rounded-full hover:bg-secondary-100",
	outside: "opacity-30",
	selected: "bg-success",
	today: "text-secondary",
	day: "text-center rounded-full",
};

type DayPickerProps = React.ComponentProps<typeof DayPicker>;

type Props = {
	value?: Date;
	onChange: (nextDate: Date) => void;
	children: React.ReactElement;
	disabled?: boolean;
};

export const Calendar: React.FC<Props> = ({
	value,
	onChange,
	children,
	disabled,
}) => {
	const [open, setOpen] = React.useState(false);
	const onDateChange = React.useCallback<OnSelectHandler<Date | undefined>>(
		(date) => {
			if (!date) {
				return;
			}
			onChange(new Date(date.valueOf() - date.getTimezoneOffset() * MINUTE));
			setOpen(false);
		},
		[onChange, setOpen],
	);
	if (disabled) {
		return children;
	}
	return (
		<Popover isOpen={open} onOpenChange={setOpen}>
			<PopoverTrigger>{children}</PopoverTrigger>
			<PopoverContent className="border-foreground border-2 p-0 shadow-md">
				<DayPicker
					mode="single"
					selected={value}
					onSelect={onDateChange}
					classNames={classNames}
					showOutsideDays
					required={false}
				/>
			</PopoverContent>
		</Popover>
	);
};
