import React from "react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@nextui-org/react-tailwind";
import ReactCalendar from "react-calendar";

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
		NonNullable<React.ComponentProps<typeof ReactCalendar>["onChange"]>
	>(
		(dateOrDates) => {
			if (Array.isArray(dateOrDates) || !dateOrDates) {
				return;
			}
			const date = dateOrDates;
			onChange(new Date(date.valueOf() - date.getTimezoneOffset() * 60000));
			changeOpen(false);
		},
		[onChange, changeOpen],
	);
	if (disabled) {
		return children;
	}
	const calendar = (
		<ReactCalendar value={value} onChange={onDateChange} selectRange={false} />
	);
	return (
		<Popover isOpen={isOpen} onOpenChange={changeOpen}>
			<PopoverTrigger>{children}</PopoverTrigger>
			<PopoverContent className="border-foreground border-2 p-0 shadow-md">
				{calendar}
			</PopoverContent>
		</Popover>
	);
};
