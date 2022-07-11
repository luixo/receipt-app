import React from "react";

import { TRPCQueryOutput } from "../trpc";
import { Text, TextLink } from "../utils/styles";

import { Block } from "./utils/block";

type Props = {
	data: TRPCQueryOutput<"users.get-paged">[number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	const innerContent =
		user.name === user.publicName
			? user.name
			: `${user.name} (public: ${user.publicName})`;
	return (
		<Block>
			{user.dirty ? (
				<Text>{innerContent}</Text>
			) : (
				<TextLink href={`/users/${user.id}/`}>{innerContent}</TextLink>
			)}
			{user.email ? <Text>Connected with {user.email}</Text> : null}
		</Block>
	);
};
