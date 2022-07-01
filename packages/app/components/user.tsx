import React from "react";
import { TextLink } from "../utils/styles";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get">;
};

export const User: React.FC<Props> = ({ data: user }) => {
	return (
		<Block>
			<TextLink href={`/users/${user.id}/`}>{user.name}</TextLink>
			{user.publicName !== user.name ? (
				<Text>Public name: {user.publicName}</Text>
			) : null}
			{user.email ? <Text>Connected with email: {user.email}</Text> : null}
		</Block>
	);
};
