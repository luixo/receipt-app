import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text, TextLink } from "../utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get-paged">[number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	return (
		<Block>
			<TextLink href={`/users/${user.id}/`}>
				{user.name === user.publicName
					? user.name
					: `${user.name} (public: ${user.publicName})`}
			</TextLink>
			{user.email ? <Text>Connected with {user.email}</Text> : null}
		</Block>
	);
};
