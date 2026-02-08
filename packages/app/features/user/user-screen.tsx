import React from "react";

import { NavigationContext } from "~app/contexts/navigation-context";
import { getPathHooks } from "~app/utils/navigation";

import { User } from "./user";

export const UserScreen = () => {
	const { useNavigate } = React.use(NavigationContext);
	const { useParams } = getPathHooks("/_protected/users/$id");
	const { id } = useParams();
	const navigate = useNavigate();

	const onUserRemove = React.useCallback(() => {
		navigate({ to: "/users", replace: true });
	}, [navigate]);

	return <User id={id} onRemove={onUserRemove} />;
};
