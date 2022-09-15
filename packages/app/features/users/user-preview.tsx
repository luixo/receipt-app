import React from "react";

import { styled } from "@nextui-org/react";

import { User } from "app/components/app/user";
import { Link } from "app/components/link";
import { TRPCQueryOutput } from "app/trpc";

const WrapperLink = styled(Link, {
	flexDirection: "row",
});

type Props = {
	data: TRPCQueryOutput<"users.getPaged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => (
	<WrapperLink href={`/users/${user.id}/`}>
		<User user={user} />
	</WrapperLink>
);
