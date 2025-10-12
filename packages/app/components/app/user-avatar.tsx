import type React from "react";

import BoringAvatar from "boring-avatars";
import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar, useAvatarGroupContext } from "~components/avatar";
import { Skeleton } from "~components/skeleton";
import { cn } from "~components/utils";
import type { UserId } from "~db/ids";
import { hslToRgb } from "~utils/color";

// The hover=true is needed to remove default translation of avatars in avatar group
const baseClassName = "shrink-0 bg-transparent data-[hover=true]:translate-x-0";

type OriginalProps = React.ComponentProps<typeof Avatar>;

type SkeletonProps = {
	size?: OriginalProps["size"] | "xs";
} & Omit<OriginalProps, "size">;

export const useSkeletonUserAvatarProps = ({
	className,
	classNames,
	...props
}: SkeletonProps) =>
	({
		showFallback: true,
		fallback: <Skeleton className="size-full" />,
		classNames: {
			fallback: "size-full",
			base: cn(
				baseClassName,
				// This is used because we don't merge with original classname
				// hence original width and height override `size-5`
				props.size === "xs" ? "h-5 w-5" : undefined,
				className,
				classNames?.base,
			),
			...classNames,
		},
		...props,
		size: props.size === "xs" ? "sm" : props.size,
	}) satisfies React.ComponentProps<typeof Avatar>;

export const SkeletonUserAvatar: React.FC<SkeletonProps> = (props) => (
	<Avatar {...useSkeletonUserAvatarProps(props)} />
);

type UserProps = SkeletonProps & {
	id: UserId;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	foreign?: boolean;
	dimmed?: boolean;
};

const getSize = (size: SkeletonProps["size"]) => {
	switch (size) {
		case "xs":
			return 20;
		case "sm":
			return 32;
		case "lg":
			return 56;
		default:
			return 40;
	}
};

const DEGREES = 360;
// We use a color from a color circle divided in given sectors
// effectively having a spread variety of colors around the circle
const SECTORS = 36;
const COLORS = new Array(SECTORS)
	.fill(null)
	.map((_, index) => `#${hslToRgb(index * (DEGREES / SECTORS), 0.7, 0.5)}`);

export const useUserAvatarProps = ({
	id,
	connectedAccount,
	className,
	classNames,
	dimmed,
	...props
}: UserProps) => {
	const { t } = useTranslation("default");
	const avatarGroupContext = useAvatarGroupContext();
	// This is a bug in types, context is actually optional
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const size = getSize(avatarGroupContext?.size ?? props.size);
	const imgProps = {
		src: connectedAccount?.avatarUrl ?? "",
		alt: t("components.avatar.alt"),
		width: size,
		height: size,
	};
	return {
		src: imgProps.src,
		radius: "full",
		fallback: (
			<BoringAvatar
				size={size}
				name={connectedAccount?.id || id}
				variant="beam"
				colors={COLORS}
			/>
		),
		...avatarGroupContext,
		...props,
		size: props.size === "xs" ? "sm" : props.size,
		classNames: {
			...classNames,
			base: cn(
				baseClassName,
				props.size === "xs" ? "h-5 w-5" : undefined,
				dimmed ? "grayscale" : undefined,
				className,
				classNames?.base,
			),
		},
		imgProps,
	} satisfies React.ComponentProps<typeof Avatar>;
};

export const UserAvatar: React.FC<UserProps> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
