import React from "react";

import { AmountBadge } from "#app/components/amount-badge.tsx";
import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { NavigationContext } from "#app/contexts/navigation-context.ts";
import { Icon } from "#components/icons.tsx";
import type { IconName } from "#components/icons.tsx";
import { Link } from "#components/link.tsx";
import { Text } from "#components/text.tsx";
import { cn } from "#components/utils.ts";
import type { ViewReactNode } from "#components/view.tsx";
import { View } from "#components/view.tsx";
import type { FileRouteTypes } from "#web/entry/routeTree.gen.ts";

type ShowProps = {
	useShow?: () => boolean;
};

type MenuElement = {
	iconName: IconName;
	text: string;
	pathname: FileRouteTypes["to"];
	useBadgeAmount?: () => number;
} & ShowProps;

const useZero = () => 0;
const useTrue = () => true;

const WithShow = suspendedFallback<React.PropsWithChildren<ShowProps>>(
	({ useShow = useTrue, children }) => {
		const show = useShow();
		if (!show) {
			return null;
		}
		return <>{children}</>;
	},
	() => null,
);

const MenuItemComponent: React.FC<MenuElement & { selected: boolean }> = ({
	iconName,
	pathname,
	text,
	useBadgeAmount = useZero,
	useShow,
	selected,
}) => (
	<WithShow useShow={useShow}>
		<Link
			key={pathname}
			to={pathname}
			className="flex flex-1 flex-col items-center justify-center"
			color={selected ? "primary" : "foreground"}
		>
			<AmountBadge useAmount={useBadgeAmount}>
				<Icon name={iconName} className="size-6" />
			</AmountBadge>
			<Text className={cn("text-sm/8", selected ? "text-primary" : undefined)}>
				{text}
			</Text>
		</Link>
	</WithShow>
);

type Props = {
	children?: ViewReactNode;
	elements: (MenuElement & {
		ItemWrapper?: React.FC<React.PropsWithChildren>;
		PageWrapper?: React.FC<React.PropsWithChildren>;
	})[];
};

export const Page: React.FC<Props> = ({ children, elements }) => {
	const { usePathname } = React.use(NavigationContext);
	const pathname = usePathname();
	const Wrapper = elements.find(
		(element) => element.pathname === pathname,
	)?.PageWrapper;
	return (
		<>
			<PageWrapper wrapper={Wrapper}>{children}</PageWrapper>
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
		</>
	);
};
