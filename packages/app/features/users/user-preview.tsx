import type React from "react";

import { User } from "~app/components/app/user";
import type { TRPCQueryOutput } from "~app/trpc";
import { Link } from "~components";

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
