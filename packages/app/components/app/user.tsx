import React from "react";

import { styled, Text, Image } from "@nextui-org/react";
import { DripsyFinalTheme, useDripsyTheme } from "dripsy";
import IdenticonJs from "identicon.js";

import { UsersId } from "next-app/db/models";

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

const getIdenticon = (hash: string, size: number, theme: DripsyFinalTheme) => {
	const backgroundColor = theme?.colors.background.slice(1);
	return `data:image/svg+xml;base64,${new IdenticonJs(hash, {
		background: [
			parseInt(backgroundColor.slice(1, 2), 16),
			parseInt(backgroundColor.slice(3, 2), 16),
			parseInt(backgroundColor.slice(5, 2), 16),
			0,
		],
		margin: 0.05,
		size,
		format: "svg",
	}).toString()}`;
};

type Props = {
	user: {
		id: UsersId;
		name: string;
		publicName?: string | null;
		email?: string | null;
	};
	avatarSize?: number;
};

export const User: React.FC<Props> = ({ user, avatarSize = 40 }) => {
	const { theme } = useDripsyTheme();
	const icon = React.useMemo(
		() => getIdenticon(user.id, avatarSize, theme),
		[user.id, avatarSize, theme]
	);
	return (
		<Wrapper>
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
					{user.email ?? undefined}
				</Text>
			</Information>
		</Wrapper>
	);
};
