import React from "react";

import { Image, Text, styled } from "@nextui-org/react";
import IdenticonJs from "identicon.js";

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

const UserName = styled(Text, {
	fontWeight: "$medium",
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
};

export const User = React.forwardRef<HTMLDivElement, Props>(
	({ user, avatarSize = 40, onClick }, ref) => {
		const icon = React.useMemo(
			() => getIdenticon(user.id, avatarSize),
			[user.id, avatarSize],
		);
		return (
			<Wrapper
				onClick={onClick}
				css={onClick ? { cursor: "pointer" } : undefined}
				ref={ref}
			>
				<AvatarImage
					width={avatarSize}
					height={avatarSize}
					alt="Avatar"
					src={icon}
				/>
				<Information>
					{/* zero margin because of inherited margin from ChildText */}
					<UserName css={{ margin: 0 }}>
						{user.name + (user.publicName ? ` (${user.publicName})` : "")}
					</UserName>
					{/* color set in css because of inherited margin from Text */}
					<Text small css={{ color: "$accents7", margin: 0 }}>
						{user.email}
					</Text>
				</Information>
			</Wrapper>
		);
	},
);
