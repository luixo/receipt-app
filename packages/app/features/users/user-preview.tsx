import React from "react";

import { cache } from "app/cache";
import { User } from "app/components/user";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { styled, Link } from "app/utils/styles";

const WrapperLink = styled(Link)({
	flexDirection: "row",
});

type Props = {
	data: TRPCQueryOutput<"users.get-paged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => {
	const trpcContext = trpc.useContext();
	const setUserName = React.useCallback(
		() => cache.users.getName.add(trpcContext, user.id, user.name),
		[trpcContext, user.id, user.name]
	);
	return (
		<WrapperLink
			href={`/users/${user.id}/`}
			onClick={setUserName}
			legacyBehavior={false}
		>
			<User user={user} />
		</WrapperLink>
	);
};
