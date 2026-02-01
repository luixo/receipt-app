import React from "react";
import { TouchableOpacity } from "react-native";

import type { RightJoinProps } from "@heroui/react";
import { keys, omit, pick } from "remeda";

import { NavigationContext } from "~app/contexts/navigation-context";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Text } from "~components/text";
import { cn } from "~components/utils";

import type { Props } from "./link";

type LinkProps = Parameters<ReturnType<NavigationContext["useNavigate"]>>[0];
const allLinkProps: Record<keyof LinkProps, true> = {
	search: true,
	params: true,
	to: true,
	replace: true,
	hash: true,
	preload: true,
	state: true,
	unsafeRelative: true,
	_fromLocation: true,
	mask: true,
	hashScrollIntoView: true,
	resetScroll: true,
	startTransition: true,
	viewTransition: true,
	ignoreBlocker: true,
	reloadDocument: true,
	target: true,
	activeOptions: true,
	preloadDelay: true,
	disabled: true,
	preloadIntentProximity: true,
};

const splitProps = <T extends LinkProps>(
	props: T,
): [React.ComponentProps<typeof Link>, Omit<T, keyof LinkProps>] => {
	const selectedKeys = keys(allLinkProps);
	return [
		pick(props, selectedKeys) as React.ComponentProps<typeof Link>,
		omit(props, selectedKeys),
	];
};

export const Link: React.FC<Props> = ({
	children,
	search,
	params,
	to,
	replace,
	hash,
	className,
	color = "primary",
}) => {
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	return (
		<TouchableOpacity
			style={{ pointerEvents: "box-only" }}
			onPress={() => {
				navigate({
					search: search as true,
					params,
					to: to as "/",
					replace,
					hash,
				});
			}}
		>
			{typeof children === "string" ? (
				<Text
					className={cn(
						"active:opacity-hover",
						color === "primary" ? "text-primary" : "text-foreground",
						className,
					)}
				>
					{children}
				</Text>
			) : (
				children
			)}
		</TouchableOpacity>
	);
};

export const ButtonLink = (
	props: RightJoinProps<LinkProps, React.ComponentProps<typeof Button>>,
) => {
	const [linkProps, restProps] = splitProps(props);
	return (
		<Link {...linkProps}>
			<Button {...restProps} />
		</Link>
	);
};
export const CardLink = (
	props: RightJoinProps<LinkProps, React.ComponentProps<typeof Card>>,
) => {
	const [linkProps, restProps] = splitProps(props);
	return (
		<Link {...linkProps}>
			<Card {...restProps} />
		</Link>
	);
};
