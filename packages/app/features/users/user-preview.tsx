import React from "react";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";
import { Text, TextLink } from "app/utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get-paged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	const innerContent = !user.publicName
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
