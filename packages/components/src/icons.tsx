import type React from "react";

import { DynamicIcon, type iconNames } from "lucide-react/dynamic";

import { cn } from "~components/utils";

const mapping = {
	refresh: "refresh-cw",
	sync: "refresh-cw",
	unsync: "refresh-cw-off",
	incoming: "arrow-left-from-line",
	outcoming: "arrow-right-from-line",
	debts: "hand-coins",
	add: "plus",
	link: "link",
	pencil: "pencil",
	unlink: "unlink",
	receipt: "receipt-text",
	send: "send",
	zero: "circle-off",
	info: "info",
	filter: "list-filter",
	admin: "shield-user",
	key: "key-round",
	money: "coins",
	transfer: "arrow-left-right",
	search: "search",
	editor: "user-pen",
	owner: "user-star",
	viewer: "user-round",
	warning: "triangle-alert",
	trash: "trash",
	check: "check",
	close: "x",
	inbox: "inbox",
	minus: "minus",
	plus: "plus",
	moon: "moon",
	sun: "sun",
	users: "users-round",
	user: "user-round",
	"arrow-left": "arrow-left",
	"arrow-right": "arrow-right",
	"arrow-down": "arrow-down",
	"chevron-down": "chevron-down",
	settings: "settings",
	login: "log-in",
	register: "user-round-plus",
	"sort-down": "arrow-down-1-0",
	"sort-up": "arrow-down-0-1",
	exchange: "chart-candlestick",
	eye: "eye",
	"eye-off": "eye-off",
} satisfies Record<string, (typeof iconNames)[number]>;

export type IconName = keyof typeof mapping;

export const Icon = ({
	name,
	className,
	...props
}: Omit<React.ComponentProps<typeof DynamicIcon>, "name" | "size"> & {
	name: IconName;
}) => (
	<DynamicIcon
		name={mapping[name]}
		className={cn("shrink-0", className)}
		{...props}
	/>
);
