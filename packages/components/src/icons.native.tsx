import React from "react";
import { TouchableOpacity } from "react-native";

import type { LucideIconName } from "@react-native-vector-icons/lucide";
import { Lucide as LucideRaw } from "@react-native-vector-icons/lucide";
import type { SFSymbol } from "sf-symbols-typescript";
import { withUniwind } from "uniwind";

import { TextClassContext } from "~components/text.native";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { IconName, Props } from "./icons";

export { Lucide as IconFamily } from "@react-native-vector-icons/lucide";

const Lucide = withUniwind(LucideRaw);

export const glyphMapping = {
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
	ellipsis: "ellipsis",
} satisfies Record<IconName, LucideIconName>;

export const sfMapping: Partial<
	Record<IconName, SFSymbol | { default: SFSymbol; selected: SFSymbol }>
> = {
	register: {
		default: "person.badge.plus",
		selected: "person.badge.plus.fill",
	},
	login: {
		default: "person.circle",
		selected: "person.circle.fill",
	},
};

// @ts-expect-error We need to override size with empty, but `undefined` will be substituted by a default value
const emptySize: undefined = null;

export const Icon = ({ name, className, testID, onClick }: Props) => {
	const textClass = React.use(TextClassContext);
	// These are actually created only once
	const finalClassNames = cn(textClass, className).split(" ");
	const transformClassNames = finalClassNames.filter(
		(lookupName) =>
			lookupName.includes("transform-") || lookupName.includes("rotate-"),
	);
	const restClassNames = finalClassNames.filter(
		(lookupName) => !transformClassNames.includes(lookupName),
	);

	let element = (
		<Lucide
			name={glyphMapping[name]}
			className={restClassNames.join(" ")}
			size={emptySize}
			pointerEvents="none"
			// Lucide specifically supports `data-testid` in native package
			// oxlint-disable-next-line eslint-js/no-restricted-syntax
			data-testid={testID}
		/>
	);
	if (transformClassNames.length !== 0) {
		element = <View className={transformClassNames.join(" ")}>{element}</View>;
	}
	if (onClick) {
		return (
			<TouchableOpacity onPress={onClick} style={{ pointerEvents: "box-only" }}>
				{element}
			</TouchableOpacity>
		);
	}
	return element;
};
