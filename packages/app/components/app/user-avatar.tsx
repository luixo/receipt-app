import type React from "react";

import BoringAvatar from "boring-avatars";
import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar } from "~components/avatar";
import { Skeleton } from "~components/skeleton";
import { tv } from "~components/utils";
import type { UserId } from "~db/ids";
import { hslToRgb } from "~utils/color";

// eslint-disable-next-line tailwindcss/enforces-shorthand
const wrapper = tv({
	base: "shrink-0 bg-transparent",
	variants: {
		dimmed: {
			true: "grayscale",
		},
		size: {
			// This is used because we don't merge with original classname
			// hence original width and height override `size-5`
			xs: "h-5 w-5",
		},
	},
});

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
			base: wrapper({
				className: [className, classNames?.base],
				size: props.size === "xs" ? props.size : undefined,
			}),
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
	const size = getSize(props.size);
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
		...props,
		size: props.size === "xs" ? "sm" : props.size,
		classNames: {
			...classNames,
			base: wrapper({
				className: [className, classNames?.base],
				size: props.size === "xs" ? props.size : undefined,
				dimmed,
			}),
		},
		imgProps,
	} satisfies React.ComponentProps<typeof Avatar>;
};

export const UserAvatar: React.FC<UserProps> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
