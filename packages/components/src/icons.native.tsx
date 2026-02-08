import React from "react";
import { TouchableOpacity } from "react-native";

import { createIconSet } from "@expo/vector-icons";
import lucideGlyphMap from "@react-native-vector-icons/lucide/glyphmaps/Lucide.json";
import * as lucideIcons from "lucide-react-native";
import type { ResponderProps } from "react-native-svg";
import type { SFSymbol } from "sf-symbols-typescript";
import { withUniwind } from "uniwind";

import { TextClassContext } from "~components/text.native";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { IconName, Props } from "./icons";

export const iconFamily = createIconSet(
	lucideGlyphMap,
	"lucide",
	// This seems to be the expected way to import a font
	// eslint-disable-next-line n/global-require, @typescript-eslint/no-require-imports
	require("@react-native-vector-icons/lucide/fonts/Lucide.ttf"),
);

const localMapping = {
	refresh: "RefreshCw",
	sync: "RefreshCw",
	unsync: "RefreshCwOff",
	incoming: "ArrowLeftFromLine",
	outcoming: "ArrowRightFromLine",
	debts: "HandCoins",
	add: "Plus",
	link: "Link",
	pencil: "Pencil",
	unlink: "Unlink",
	receipt: "ReceiptText",
	send: "Send",
	zero: "CircleOff",
	info: "Info",
	filter: "ListFilter",
	admin: "ShieldUser",
	key: "KeyRound",
	money: "Coins",
	transfer: "ArrowLeftRight",
	search: "Search",
	editor: "UserPen",
	owner: "UserStar",
	viewer: "UserRound",
	warning: "TriangleAlert",
	trash: "Trash",
	check: "Check",
	close: "X",
	inbox: "Inbox",
	minus: "Minus",
	plus: "Plus",
	moon: "Moon",
	sun: "Sun",
	users: "UsersRound",
	user: "UserRound",
	"arrow-left": "ArrowLeft",
	"arrow-right": "ArrowRight",
	"arrow-down": "ArrowDown",
	"chevron-down": "ChevronDown",
	settings: "Settings",
	login: "LogIn",
	register: "UserRoundPlus",
	"sort-down": "ArrowDown10",
	"sort-up": "ArrowDown01",
	exchange: "ChartCandlestick",
	eye: "Eye",
	"eye-off": "EyeOff",
	ellipsis: "Ellipsis",
} satisfies Record<IconName, keyof typeof lucideIcons>;

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
} satisfies Record<IconName, keyof (typeof iconFamily)["glyphMap"]>;

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

const componentsCache: Partial<
	Record<
		IconName,
		React.ComponentType<
			lucideIcons.LucideProps & {
				className?: string;
				pointerEvents?: ResponderProps["pointerEvents"];
			}
		>
	>
> = {};
const getComponent = (icon: IconName) => {
	if (!componentsCache[icon]) {
		componentsCache[icon] = withUniwind(lucideIcons[localMapping[icon]]);
	}
	return componentsCache[icon];
};
// @ts-expect-error We need to override size with empty, but `undefined` will be substituted by a default value
const emptySize: undefined = null;

export const Icon = ({ name, className, testID, onClick }: Props) => {
	const textClass = React.useContext(TextClassContext);
	const Component = getComponent(name);
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
		// eslint-disable-next-line react-hooks/static-components
		<Component
			className={restClassNames.join(" ")}
			size={emptySize}
			pointerEvents="none"
			// Lucide specifically supports `data-testid` in native package
			// eslint-disable-next-line no-restricted-syntax
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
