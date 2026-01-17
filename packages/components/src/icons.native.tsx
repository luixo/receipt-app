import type React from "react";
import { TouchableOpacity } from "react-native";

import * as lucideIcons from "lucide-react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { withUniwind } from "uniwind";

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
	const Component = getComponent(name);
	// These are actually created only once
	// eslint-disable-next-line react-hooks/static-components
	const element = <Component className={className} size={emptySize} />;
	if (onClick) {
		return (
			<TouchableOpacity onPress={onClick} style={{ pointerEvents: "box-only" }}>
				{element}
			</TouchableOpacity>
		);
	}
	return element;
};
