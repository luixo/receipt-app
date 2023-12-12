import React from "react";

import { Avatar, tv } from "@nextui-org/react";
import IdenticonJs from "identicon.js";
import Image from "next/image";

import type { TRPCQueryOutput } from "app/trpc";
import type { MakeOptional } from "app/utils/types";
import type { UsersId } from "next-app/db/models";

const wrapper = tv({
	base: "bg-transparent",
});

const getIdenticon = (hash: string, size: number) =>
	`data:image/svg+xml;base64,${new IdenticonJs(hash, {
		background: [255, 255, 255, 0],
		margin: 0.05,
		size,
		format: "svg",
	}).toString()}`;

type Props = {
	id: UsersId;
	account?: MakeOptional<
		NonNullable<TRPCQueryOutput<"users.getPaged">["items"][number]["account"]>
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

export const useUserAvatarProps = ({
	id,
	account,
	className,
	classNames,
	...props
}: Props) => {
	const size = getSize(props.size);
	const icon = React.useMemo(
		() => getIdenticon(account?.id || id, size),
		[id, account?.id, size],
	);
	return {
		src: icon,
		radius: "sm",
		ImgComponent: Image,
		...props,
		classNames: { ...classNames, base: wrapper({ className }) },
		imgProps: { width: size, height: size, ...props.imgProps },
	} satisfies React.ComponentProps<typeof Avatar>;
};

export const UserAvatar: React.FC<Props> = (props) => (
	<Avatar {...useUserAvatarProps(props)} />
);
