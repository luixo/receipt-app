import React from "react";

import { Block } from "app/components/block";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { updateUserName } from "app/utils/queries/users-get-name";
import { Text, TextLink } from "app/utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get-paged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	const trpcContext = trpc.useContext();
	const setUserName = React.useCallback(
		() => updateUserName(trpcContext, { id: user.id }, user.name),
		[trpcContext, user.id, user.name]
	);
	const innerContent = !user.publicName
		? user.name
		: `${user.name} (public: ${user.publicName})`;
	return (
		<Block>
			{user.dirty ? (
				<Text>{innerContent}</Text>
			) : (
				<TextLink
					href={`/users/${user.id}/`}
					onClick={setUserName}
					legacyBehavior={false}
				>
					{innerContent}
				</TextLink>
			)}
			{user.email ? <Text>Connected with {user.email}</Text> : null}
		</Block>
	);
};
