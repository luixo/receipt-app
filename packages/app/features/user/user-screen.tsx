import React from "react";

import { NavigationContext } from "~app/contexts/navigation-context";
import type { UserId } from "~db/ids";

import { User } from "./user";

export const UserScreen: React.FC<{ id: UserId }> = ({ id }) => {
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const onUserRemove = React.useCallback(() => {
		navigate({ to: "/users", replace: true });
	}, [navigate]);

	return <User id={id} onRemove={onUserRemove} />;
};
