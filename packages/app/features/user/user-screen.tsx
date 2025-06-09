import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { useNavigate } from "~app/hooks/use-navigation";
import { BackLink } from "~components/link";
import type { UsersId } from "~db/models";

import { User } from "./user";

export const UserScreen: React.FC<{ id: UsersId }> = ({ id }) => {
	const navigate = useNavigate();

	const onUserRemove = React.useCallback(() => {
		navigate({ to: "/users", replace: true });
	}, [navigate]);

	return (
		<>
			<PageHeader startContent={<BackLink to="/users" />}>
				<LoadableUser id={id} />
			</PageHeader>
			<User id={id} onRemove={onUserRemove} />
		</>
	);
};
