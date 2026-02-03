import type React from "react";

import {
	ArrowDown,
	ArrowDown01,
	ArrowDown10,
	ArrowLeft,
	ArrowLeftFromLine,
	ArrowLeftRight,
	ArrowRight,
	ArrowRightFromLine,
	ChartCandlestick,
	Check,
	ChevronDown,
	CircleOff,
	Coins,
	Ellipsis,
	Eye,
	EyeOff,
	HandCoins,
	Inbox,
	Info,
	KeyRound,
	Link,
	ListFilter,
	LogIn,
	Minus,
	Moon,
	Pencil,
	Plus,
	ReceiptText,
	RefreshCw,
	RefreshCwOff,
	Search,
	Send,
	Settings,
	ShieldUser,
	Sun,
	Trash,
	TriangleAlert,
	Unlink,
	UserPen,
	UserRound,
	UserRoundPlus,
	UserStar,
	UsersRound,
	X,
} from "lucide-react";

import { cn } from "~components/utils";

const mapping = {
	refresh: RefreshCw,
	sync: RefreshCw,
	unsync: RefreshCwOff,
	incoming: ArrowLeftFromLine,
	outcoming: ArrowRightFromLine,
	debts: HandCoins,
	add: Plus,
	link: Link,
	pencil: Pencil,
	unlink: Unlink,
	receipt: ReceiptText,
	send: Send,
	zero: CircleOff,
	info: Info,
	filter: ListFilter,
	admin: ShieldUser,
	key: KeyRound,
	money: Coins,
	transfer: ArrowLeftRight,
	search: Search,
	editor: UserPen,
	owner: UserStar,
	viewer: UserRound,
	warning: TriangleAlert,
	trash: Trash,
	check: Check,
	close: X,
	inbox: Inbox,
	minus: Minus,
	plus: Plus,
	moon: Moon,
	sun: Sun,
	users: UsersRound,
	user: UserRound,
	"arrow-left": ArrowLeft,
	"arrow-right": ArrowRight,
	"arrow-down": ArrowDown,
	"chevron-down": ChevronDown,
	settings: Settings,
	login: LogIn,
	register: UserRoundPlus,
	"sort-down": ArrowDown10,
	"sort-up": ArrowDown01,
	exchange: ChartCandlestick,
	eye: Eye,
	"eye-off": EyeOff,
	ellipsis: Ellipsis,
} satisfies Record<string, typeof ArrowLeft>;

export type IconName = keyof typeof mapping;

export type Props = Pick<
	React.ComponentProps<(typeof mapping)["eye"]>,
	"className"
> & {
	onClick?: () => void;
	name: IconName;
	testID?: string;
};

export const Icon = ({ name, className, testID, ...props }: Props) => {
	const Component = mapping[name];
	return (
		<Component
			data-testid={testID}
			className={cn(
				"shrink-0",
				props.onClick ? "cursor-pointer" : undefined,
				className,
			)}
			{...props}
		/>
	);
};
