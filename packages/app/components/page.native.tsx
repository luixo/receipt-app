import type React from "react";

import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCSSVariable } from "uniwind";

import type { IconName } from "~components/icons";
import { glyphMapping, iconFamily } from "~components/icons.native";
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
	elements: (MenuElement & {
		ItemWrapper?: React.FC<React.PropsWithChildren>;
		PageWrapper?: React.FC<React.PropsWithChildren>;
	})[];
};

export const Page: React.FC<Props> = ({ elements }) => {
	/* eslint-disable react-hooks/rules-of-hooks */
	// We're pretty sure amount of these elements is stable, but running hooks inside a callback is not an option
	// And we can't move tabs outside because NativeTabs don't digest wrapped Triggers
	const shows = elements.map(({ useShow = useTrue }) => useShow());
	const badgeAmounts = elements.map(({ useBadgeAmount = useZero }) =>
		useBadgeAmount(),
	);
	/* eslint-enable react-hooks/rules-of-hooks */
	const foregroundColor = useCSSVariable(`--heroui-foreground`) as string;
	const backgroundColor = useCSSVariable(`--heroui-background`) as string;
	const primaryColor = useCSSVariable(`--heroui-primary`) as string;
	return (
		<NativeTabs
			labelStyle={{
				default: {
					color: foregroundColor,
				},
				selected: {
					color: primaryColor,
				},
			}}
			iconColor={{
				default: foregroundColor,
				selected: primaryColor,
			}}
		>
			{elements.map(({ text, pathname, iconName }, index) => (
				<NativeTabs.Trigger
					key={pathname}
					name={pathname.slice(1)}
					hidden={!shows[index]}
					contentStyle={{ backgroundColor }}
				>
					<NativeTabs.Trigger.Label>{text}</NativeTabs.Trigger.Label>
					<NativeTabs.Trigger.Icon
						src={
							<NativeTabs.Trigger.VectorIcon
								family={iconFamily}
								name={glyphMapping[iconName]}
							/>
						}
					/>
					{badgeAmounts[index] ? (
						<NativeTabs.Trigger.Badge>
							{badgeAmounts[index].toString()}
						</NativeTabs.Trigger.Badge>
					) : null}
				</NativeTabs.Trigger>
			))}
		</NativeTabs>
	);
};
