import type React from "react";

import BoringAvatar from "boring-avatars";
import { getImageProps } from "next/image";

import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar } from "~components/avatar";
import { tv } from "~components/utils";
import type { UsersId } from "~db/models";
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

type Props = {
	id: UsersId;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	foreign?: boolean;
	dimmed?: boolean;
	size?: OriginalProps["size"] | "xs";
} & Omit<OriginalProps, "size">;

const getSize = (size: Props["size"]) => {
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
}: Props) => {
	const size = getSize(props.size);
	const { props: imgProps } = getImageProps({
		src: connectedAccount?.avatarUrl ?? "",
		alt: "Avatar",
		width: size,
		height: size,
	});
	return {
		src: imgProps.src,
		srcSet: imgProps.srcSet,
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

export const UserAvatar: React.FC<Props> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
