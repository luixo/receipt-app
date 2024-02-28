import React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import { DayPicker } from "react-day-picker";

import { MINUTE } from "~utils";

const classNames: NonNullable<DayPickerProps["classNames"]> = {
	root: "flex max-w-full max-h-full bg-background p-4 rounded-large items-center h-80",
	button: "px-3 py-2 rounded-full hover:bg-secondary-100",
	caption: "flex flex-row font-medium text-lg gap-2 justify-between px-2",
	months: "flex-1 h-full",
	month: "flex flex-col gap-2 h-full justify-between",
	head_cell: "px-2",
	nav: "flex gap-2",
	nav_button: "flex p-2",
	cell: "text-center",
	day_outside: "opacity-30",
	day_selected: "bg-success",
	day_today: "text-secondary",
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
	const [isOpen, changeOpen] = React.useState(false);
	const onDateChange = React.useCallback<
		NonNullable<Extract<DayPickerProps, { mode: "single" }>["onSelect"]>
	>(
		(date) => {
			if (!date) {
				return;
			}
			onChange(new Date(date.valueOf() - date.getTimezoneOffset() * MINUTE));
			changeOpen(false);
		},
		[onChange, changeOpen],
	);
	if (disabled) {
		return children;
	}
	return (
		<Popover isOpen={isOpen} onOpenChange={changeOpen}>
			<PopoverTrigger>{children}</PopoverTrigger>
			<PopoverContent className="border-foreground border-2 p-0 shadow-md">
				<DayPicker
					mode="single"
					selected={value}
					onSelect={onDateChange}
					classNames={classNames}
					showOutsideDays
				/>
			</PopoverContent>
		</Popover>
	);
};
