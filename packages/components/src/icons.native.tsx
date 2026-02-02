import React from "react";
import { TouchableOpacity } from "react-native";

import * as lucideIcons from "lucide-react-native";
import type { ResponderProps } from "react-native-svg";
import type { SFSymbol } from "sf-symbols-typescript";
import { withUniwind } from "uniwind";

import { TextClassContext } from "~components/text.native";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { IconName, Props } from "./icons";

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

export const Icon = ({ name, className, onClick }: Props) => {
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
