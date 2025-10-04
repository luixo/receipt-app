import React from "react";

import { Calendar as RawCalendar } from "@heroui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { Temporal } from "~utils/date";

type Props = React.ComponentProps<typeof RawCalendar<Temporal.PlainDate>>;

export const Calendar: React.FC<Props> = ({
	children,
	onChange: onChangeRaw,
	...props
}) => {
	const [open, { setTrue: setOpen, setFalse: setClose }] =
		useBooleanState(false);
	const onChange = React.useCallback<
		NonNullable<
			React.ComponentProps<typeof RawCalendar<Temporal.PlainDate>>["onChange"]
		>
	>(
		(date) => {
			onChangeRaw?.(date);
			setClose();
		},
		[onChangeRaw, setClose],
	);
	return (
		<Popover
			isOpen={open}
			onOpenChange={setOpen}
			isTriggerDisabled={props.isDisabled}
		>
			<PopoverTrigger>{children}</PopoverTrigger>
			<PopoverContent className="border-2 border-foreground p-0 shadow-md">
				<RawCalendar<Temporal.PlainDate>
					onChange={onChange}
					showMonthAndYearPickers
					{...props}
				/>
			</PopoverContent>
		</Popover>
	);
};
