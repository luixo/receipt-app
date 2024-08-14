import type React from "react";

import BoringAvatar from "boring-avatars";
import { getImageProps } from "next/image";

import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar, tv } from "~components";
import type { UsersId } from "~db";
import { hslToRgb } from "~utils/color";

const wrapper = tv({
	base: "shrink-0 bg-transparent",
});

type OriginalProps = React.ComponentProps<typeof Avatar>;

type Props = {
	id: UsersId;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	foreign?: boolean;
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

const BW_LEVELS = 6;
const EDGE_MARGIN = 0.3;
const BW_COLORS = new Array(BW_LEVELS + 1)
	.fill(null)
	.map(
		(_, index) =>
			`#${hslToRgb(
				0,
				0,
				(1 - 2 * EDGE_MARGIN) * (index / BW_LEVELS) + EDGE_MARGIN,
			)}`,
	);

export const useUserAvatarProps = ({
	id,
	connectedAccount,
	className,
	classNames,
	foreign,
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
				colors={foreign ? BW_COLORS : COLORS}
			/>
		),
		...props,
		size: props.size === "xs" ? "sm" : props.size,
		classNames: { ...classNames, base: wrapper({ className }) },
		imgProps,
	} satisfies React.ComponentProps<typeof Avatar>;
};

export const UserAvatar: React.FC<Props> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
