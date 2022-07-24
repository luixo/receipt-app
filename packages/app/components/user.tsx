import React from "react";
import * as ReactNative from "react-native";

import { styled as nextStyled, Text } from "@nextui-org/react";

import { Identicon } from "app/components/identicon";
import { styled } from "app/utils/styles";
import { UsersId } from "next-app/db/models";

const Wrapper = nextStyled("div", {
	display: "flex",
});

const Information = styled(ReactNative.View)({
	marginLeft: "sm",
	justifyContent: "center",
});

const UserName = nextStyled(Text, {
	fontWeight: "$medium",
});

type Props = {
	user: {
		id: UsersId;
		name: string;
		publicName?: string | null;
		email?: string | null;
	};
};

export const User: React.FC<Props> = ({ user }) => (
	<Wrapper>
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
	</Wrapper>
);
