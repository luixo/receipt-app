import React from "react";

import { StoreContext } from "~app/contexts/store-context";
import { AUTH_COOKIE } from "~app/utils/auth";

export const useAuth = () => {
	const { deleteItem } = React.useContext(StoreContext);
	const unauthorize = React.useCallback(() => {
		void deleteItem(AUTH_COOKIE);
	}, [deleteItem]);
	return { unauthorize };
};
