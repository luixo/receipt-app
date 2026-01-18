import React from "react";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { BackLink } from "~components/link";
import type { UserId } from "~db/ids";

import { User } from "./user";

export const UserScreen: React.FC<{ id: UserId }> = ({ id }) => {
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const onUserRemove = React.useCallback(() => {
		navigate({ to: "/users", replace: true });
	}, [navigate]);

	return (
		<>
			<PageHeader
				startContent={<BackLink to="/users" />}
				endContent={<LoadableUser id={id} />}
			/>
			<User id={id} onRemove={onUserRemove} />
		</>
	);
};
