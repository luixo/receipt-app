import type React from "react";
import { View } from "react-native";

import { AmountBadge } from "~app/components/amount-badge";
import { usePathname } from "~app/hooks/use-navigation";
import { Link } from "~components/link";
import { Text } from "~components/text";
import { tv } from "~components/utils";
import type { FileRouteTypes } from "~web/entry/routeTree.gen";

export type MenuElement = {
	Icon: React.FC<{ size: number }>;
	text: string;
	pathname: FileRouteTypes["to"];
	useBadgeAmount?: () => number;
	useShow?: () => boolean;
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

const MenuItemComponent: React.FC<MenuElement & { selected: boolean }> = ({
	Icon,
	pathname,
	text,
	useBadgeAmount = useZero,
	useShow = useTrue,
	selected,
}) => {
	const show = useShow();
	if (!show) {
		return null;
	}
	const icon = <Icon size={24} />;
	return (
		<Link key={pathname} to={pathname} className={link({ selected })}>
			<AmountBadge useAmount={useBadgeAmount}>{icon}</AmountBadge>
			<Text className={`text-sm leading-8 ${selected ? "text-primary" : ""}`}>
				{text}
			</Text>
		</Link>
	);
};

type Props = {
	children?: React.ReactNode;
	elements: (MenuElement & {
		ItemWrapper?: React.FC<React.PropsWithChildren>;
		PageWrapper?: React.FC<React.PropsWithChildren>;
	})[];
};

export const Page: React.FC<Props> = ({ children, elements }) => {
	const pathname = usePathname();
	const PageWrapper = elements.find(
		(element) => element.pathname === pathname,
	)?.PageWrapper;
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
						const element = (
							<MenuItemComponent
								key={props.pathname}
								{...props}
								selected={pathname.startsWith(props.pathname)}
							/>
						);
						if (ItemWrapper) {
							return <ItemWrapper key={props.pathname}>{element}</ItemWrapper>;
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
