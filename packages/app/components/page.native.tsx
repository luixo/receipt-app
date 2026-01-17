import type React from "react";

import {
	Badge,
	Icon,
	Label,
	NativeTabs,
} from "expo-router/unstable-native-tabs";

import type { IconName } from "~components/icons.base";
import { sfMapping } from "~components/icons.native";
import type { FileRouteTypes } from "~web/entry/routeTree.gen";

type ShowProps = {
	useShow?: () => boolean;
};

export type MenuElement = {
	iconName: IconName;
	text: string;
	pathname: FileRouteTypes["to"];
	useBadgeAmount?: () => number;
} & ShowProps;

const useZero = () => 0;
const useTrue = () => true;

type Props = {
	children?: React.ReactNode;
	elements: (MenuElement & {
		ItemWrapper?: React.FC<React.PropsWithChildren>;
		PageWrapper?: React.FC<React.PropsWithChildren>;
	})[];
};

export const Page: React.FC<Props> = ({ elements, children }) => {
	/* eslint-disable react-hooks/rules-of-hooks */
	// We're pretty sure amount of these elements is stable, but running hooks inside a callback is not an option
	// And we can't move tabs outside because NativeTabs don't digest wrapped Triggers
	const shows = elements.map(({ useShow = useTrue }) => useShow());
	const badgeAmounts = elements.map(({ useBadgeAmount = useZero }) =>
		useBadgeAmount(),
	);
	/* eslint-enable react-hooks/rules-of-hooks */
	return (
		<NativeTabs>
			{elements.map(({ text, pathname, iconName }, index) => (
				<NativeTabs.Trigger
					key={pathname}
					name={pathname.slice(1)}
					hidden={!shows[index]}
				>
					<Label>{text}</Label>
					<Icon sf={sfMapping[iconName] ?? "questionmark"} />
					{badgeAmounts[index] ? (
						<Badge>{badgeAmounts[index].toString()}</Badge>
					) : null}
				</NativeTabs.Trigger>
			))}
			{children}
		</NativeTabs>
	);
};
