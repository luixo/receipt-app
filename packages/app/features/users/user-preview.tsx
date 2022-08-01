import React from "react";

import { styled, Link } from "@nextui-org/react";

import { cache } from "app/cache";
import { User } from "app/components/app/user";
import { trpc, TRPCQueryOutput } from "app/trpc";

const WrapperLink = styled(Link, {
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
		<WrapperLink href={`/users/${user.id}/`} onClick={setUserName}>
			<User user={user} />
		</WrapperLink>
	);
};
