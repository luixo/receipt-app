import React from "react";

import { Image, styled } from "@nextui-org/react";
import IdenticonJs from "identicon.js";

import { Text } from "app/components/base/text";
import type { UsersId } from "next-app/db/models";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
});

const Information = styled("div", {
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	marginLeft: "$sm",
});

const AvatarImage = styled(Image, {
	flexShrink: 0,
	margin: 0,
});

const getIdenticon = (hash: string, size: number) =>
	`data:image/svg+xml;base64,${new IdenticonJs(hash, {
		background: [255, 255, 255, 0],
		margin: 0.05,
		size,
		format: "svg",
	}).toString()}`;

export type Props = {
	user: {
		id: UsersId;
		name: string;
		publicName?: string;
		email?: string;
	};
	avatarSize?: number;
	onClick?: () => void;
} & Omit<React.ComponentProps<typeof Wrapper>, "onClick" | "css">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	({ user, avatarSize = 40, onClick, ...props }, ref) => {
		const icon = React.useMemo(
			() => getIdenticon(user.id, avatarSize),
			[user.id, avatarSize],
		);
		return (
			<Wrapper
				onClick={onClick}
				css={onClick ? { cursor: "pointer" } : undefined}
				ref={ref}
				{...props}
			>
				<AvatarImage
					width={avatarSize}
					height={avatarSize}
					alt="Avatar"
					src={icon}
				/>
				<Information>
					<Text className="font-medium">
						{user.name + (user.publicName ? ` (${user.publicName})` : "")}
					</Text>
					<Text className="text-default-400 text-sm">{user.email}</Text>
				</Information>
			</Wrapper>
		);
	},
);
