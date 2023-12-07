import React from "react";

import { Link } from "@nextui-org/react-tailwind";

import { User } from "app/components/app/user";
import type { TRPCQueryOutput } from "app/trpc";

type Props = {
	data: TRPCQueryOutput<"users.getPaged">["items"][number];
};

export const UserPreview: React.FC<Props> = ({ data: user }) => (
	<Link href={`/users/${user.id}/`}>
		<User user={user} />
	</Link>
);
