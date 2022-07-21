import React from "react";
import * as ReactNative from "react-native";

import { styled as nextStyled, Text } from "@nextui-org/react";

import { Identicon } from "app/components/identicon";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { updateUserName } from "app/utils/queries/users-get-name";
import { styled, Link } from "app/utils/styles";

const WrapperLink = styled(Link)({
	flexDirection: "row",
});

const Information = styled(ReactNative.View)({
	marginLeft: "sm",
	justifyContent: "center",
});

const UserName = nextStyled(Text, {
	fontWeight: "$medium",
});

type Props = {
	data: TRPCQueryOutput<"users.get-paged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	const trpcContext = trpc.useContext();
	const setUserName = React.useCallback(
		() => updateUserName(trpcContext, { id: user.id }, user.name),
		[trpcContext, user.id, user.name]
	);
	return (
		<WrapperLink
			href={`/users/${user.id}/`}
			onClick={setUserName}
			legacyBehavior={false}
		>
			<Identicon hash={user.id} size={40} altText={user.name} />
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
		</WrapperLink>
	);
};
