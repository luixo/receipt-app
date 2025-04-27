import type React from "react";
import { View } from "react-native";

import { useMatchRoute } from "~app/hooks/use-navigation";
import { Badge } from "~components/badge";
import { Link } from "~components/link";
import { Text } from "~components/text";
import { tv } from "~components/utils";

export type MenuElement = {
	Icon: React.FC<{ size: number }>;
	text: string;
	href: string;
	useBadgeAmount?: () => number;
	useShow?: () => boolean;
	ItemWrapper?: React.FC<React.PropsWithChildren>;
	PageWrapper?: React.FC<React.PropsWithChildren>;
};

const useZero = () => 0;
const useTrue = () => true;

const link = tv({
	base: "text-foreground flex flex-1 flex-col items-center justify-center",
	variants: {
		selected: {
			true: "text-primary",
		},
	},
});

const MenuItemComponent: React.FC<MenuElement> = ({
	Icon,
	href,
	text,
	useBadgeAmount = useZero,
	useShow = useTrue,
}) => {
	const matchRoute = useMatchRoute();
	const amount = useBadgeAmount();
	const show = useShow();
	if (!show) {
		return null;
	}
	const selected = matchRoute(href);
	const icon = <Icon size={24} />;
	return (
		<Link key={href} href={href} className={link({ selected })}>
			{amount === 0 ? (
				icon
			) : (
				<Badge content={amount} color="danger" placement="top-right" size="lg">
					{icon}
				</Badge>
			)}
			<Text className={`text-sm leading-8 ${selected ? "text-primary" : ""}`}>
				{text}
			</Text>
		</Link>
	);
};

type Props = {
	children?: React.ReactNode;
	elements: MenuElement[];
};

export const Page: React.FC<Props> = ({ children, elements }) => {
	const matchRoute = useMatchRoute();
	const PageWrapper = elements.find((element) => matchRoute(element.href))
		?.PageWrapper;
	const slot = <View className="gap-4">{children}</View>;
	return (
		<View className="mx-auto max-w-screen-md overflow-x-hidden overflow-y-scroll p-1 sm:p-2 md:p-4">
			{PageWrapper ? <PageWrapper>{slot}</PageWrapper> : slot}
			<View
				className="bg-content1 fixed bottom-0 left-0 z-20 w-full flex-row p-2 shadow-lg"
				testID="sticky-menu"
			>
				<View className="mx-auto max-w-screen-sm flex-1 flex-row">
					{elements.map(({ ItemWrapper, ...props }) => {
						const element = <MenuItemComponent key={props.href} {...props} />;
						if (ItemWrapper) {
							return <ItemWrapper key={props.href}>{element}</ItemWrapper>;
						}
						return element;
					})}
				</View>
			</View>
			{/* Placeholder for page content not to get under the menu */}
			<View className="h-[72px]" />
		</View>
	);
};
