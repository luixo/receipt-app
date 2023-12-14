import React from "react";

import { Avatar, tv } from "@nextui-org/react";
import BoringAvatar from "boring-avatars";
import { unstable_getImgProps as getImgProps } from "next/image";

import type { TRPCQueryOutput } from "app/trpc";
import { hslToRgb } from "app/utils/color";
import type { MakeOptional } from "app/utils/types";
import type { UsersId } from "next-app/db/models";

const wrapper = tv({
	base: "bg-transparent",
});

type Props = {
	id: UsersId;
	account?: MakeOptional<
		Pick<
			NonNullable<
				TRPCQueryOutput<"users.getPaged">["items"][number]["account"]
			>,
			"id" | "avatarUrl"
		>
	>;
} & React.ComponentProps<typeof Avatar>;

const getSize = (size: React.ComponentProps<typeof Avatar>["size"]) => {
	switch (size) {
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
	account,
	className,
	classNames,
	...props
}: Props) => {
	const size = getSize(props.size);
	const { props: imgProps } = getImgProps({
		src: account?.avatarUrl || "",
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
				name={account?.id || id}
				variant="beam"
				colors={COLORS}
			/>
		),
		...props,
		classNames: { ...classNames, base: wrapper({ className }) },
		imgProps,
	} satisfies React.ComponentProps<typeof Avatar>;
};

export const UserAvatar: React.FC<Props> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
