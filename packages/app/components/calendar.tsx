import React from "react";

import { globalCss, Popover } from "@nextui-org/react";
import ReactCalendar from "react-calendar";

const calendarStyles = globalCss({
	".react-calendar": {
		width: 350,
		maxWidth: "100%",
		background: "$background",
		borderStyle: "solid",
		borderColor: "$border",
		borderRadius: "$md",
		fontFamily: "$sans",
		lineHeight: "$sm",
		p: "$4",

		"&, & *, & *:before, & *:after": {
			boxSizing: "border-box",
		},

		"& button": {
			margin: 0,
			border: 0,
			outline: "none",

			"&:enabled:hover": {
				cursor: "pointer",
			},
		},

		"&__navigation": {
			display: "flex",
			height: 44,

			"& button": {
				minWidth: 44,
				background: "none",

				"&:disabled": {
					backgroundColor: "$accents2",
				},

				"&:enabled": {
					"&:hover, &:focus": {
						backgroundColor: "$neutralLightHover",
					},
				},
			},
		},

		"&__month-view": {
			"&__weekdays": {
				textAlign: "center",
				textTransform: "uppercase",
				fontWeight: "bold",
				fontSize: "$sm",
				my: "$2",

				"&__weekday": {
					padding: "$4",
					borderBottomStyle: "solid",
					borderTopStyle: "solid",
					borderWidth: 1,
					borderColor: "$border",
				},
			},

			"&__weekNumbers .react-calendar__tile": {
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "$sm",
				fontWeight: "bold",
			},

			"&__days__day": {
				"&--weekend": {
					color: "$errorLightContrast",
				},

				"&--neighboringMonth": {
					color: "$neutralLightHover",
				},
			},
		},

		"&__year-view .react-calendar__tile, &__decade-view .react-calendar__tile, &__centurty-view .react-calendar__tile":
			{
				px: "$1",
				py: "$4",
			},
	},

	".react-calendar__tile": {
		maxWidth: "100%",
		p: "$5",
		background: "none",
		textAlign: "center",
		lineHeight: "16px",
		borderRadius: "$md",

		"&:disabled": {
			backgroundColor: "$accents2",
		},

		"&:enabled": {
			"&:hover, &:focus": {
				backgroundColor: "$neutralLightHover",
			},
		},

		"&--now": {
			background: "$warningLight",

			"&:enabled": {
				"&:hover, &:focus": {
					background: "$warningLightHover",
				},
			},
		},

		"&--hasActive": {
			background: "$successBorder",

			"&:enabled": {
				"&:hover, &:focus": {
					background: "#successBorderHover",
				},
			},
		},

		"&--active": {
			background: "$successLight",
			color: "$text",

			"&:enabled": {
				"&:hover, &:focus": {
					background: "$successLightHover",
				},
			},
		},
	},
});

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
	const onDateChange = React.useCallback(
		(date: Date) => {
			onChange(new Date(date.valueOf() - date.getTimezoneOffset() * 60000));
			changeOpen(false);
		},
		[onChange, changeOpen]
	);
	calendarStyles();
	if (disabled) {
		return children;
	}
	const calendar = (
		<ReactCalendar value={value} onChange={onDateChange} selectRange={false} />
	);
	return (
		<Popover isOpen={isOpen} onOpenChange={changeOpen}>
			<Popover.Trigger>{children}</Popover.Trigger>
			<Popover.Content>{calendar}</Popover.Content>
		</Popover>
	);
};
