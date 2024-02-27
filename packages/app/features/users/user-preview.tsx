import React from "react";

import { Link } from "@nextui-org/react";

import { User } from "~app/components/app/user";
import type { TRPCQueryOutput } from "~app/trpc";

type Props = {
	user: TRPCQueryOutput<"users.get">;
};

export const UserPreview: React.FC<Props> = ({ user }) => (
	<Link href={`/users/${user.id}/`}>
		<User
			id={user.id}
			name={user.name}
			connectedAccount={user.connectedAccount}
		/>
	</Link>
);
