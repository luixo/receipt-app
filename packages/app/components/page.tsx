import type React from "react";
import { View } from "react-native";

import type { ExistingPath, UrlParams } from "~app/hooks/use-navigation";
import { buildUrl, usePathname } from "~app/hooks/use-navigation";
import { Badge } from "~components/badge";
import { Link } from "~components/link";
import { Text } from "~components/text";
import { tv } from "~components/utils";

export type MenuElement<P extends ExistingPath> = {
	Icon: React.FC<{ size: number }>;
	text: string;
	urlParams: UrlParams<P>;
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

// eslint-disable-next-line react/function-component-definition
function MenuItemComponent<P extends ExistingPath>({
	Icon,
	urlParams,
	text,
	useBadgeAmount = useZero,
	useShow = useTrue,
	selected,
}: MenuElement<P> & { selected: boolean }) {
	const amount = useBadgeAmount();
	const show = useShow();
	if (!show) {
		return null;
	}
	const url = buildUrl(urlParams);
	const icon = <Icon size={24} />;
	return (
		<Link key={url} {...urlParams} className={link({ selected })}>
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
}

type Props<P extends ExistingPath> = {
	children?: React.ReactNode;
	elements: (MenuElement<P> & {
		ItemWrapper?: React.FC<React.PropsWithChildren>;
		PageWrapper?: React.FC<React.PropsWithChildren>;
	})[];
};

// eslint-disable-next-line react/function-component-definition
export function Page<P extends ExistingPath>({ children, elements }: Props<P>) {
	const pathname = usePathname() ?? "";
	const PageWrapper = elements.find(
		(element) => buildUrl(element.urlParams) === pathname,
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
						const url = buildUrl(props.urlParams);
						const element = (
							<MenuItemComponent
								key={url}
								{...props}
								selected={pathname.startsWith(url)}
							/>
						);
						if (ItemWrapper) {
							return <ItemWrapper key={url}>{element}</ItemWrapper>;
						}
						return element;
					})}
				</View>
			</View>
			{/* Placeholder for page content not to get under the menu */}
			<View className="h-[72px]" />
		</View>
	);
}
