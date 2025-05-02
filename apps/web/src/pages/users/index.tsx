import { parseAsInteger, useQueryState } from "nuqs";

import { DEFAULT_LIMIT, UsersScreen } from "~app/features/users/users-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const limitState = useQueryState(
		"limit",
		parseAsInteger.withDefault(DEFAULT_LIMIT),
	);
	const offsetState = useQueryState("offset", parseAsInteger.withDefault(0));
	return <UsersScreen limitState={limitState} offsetState={offsetState} />;
};

export default Screen;
