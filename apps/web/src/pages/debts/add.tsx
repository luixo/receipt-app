import { parseAsString, useQueryState } from "nuqs";

import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import type { UsersId } from "~db/models";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const userIdState = useQueryState<UsersId>(
		"userId",
		parseAsString.withDefault(""),
	);
	return <AddDebtScreen userIdState={userIdState} />;
};

export default Screen;
