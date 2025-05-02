import { parseAsString, useQueryState } from "nuqs";

import { DebtsTransferScreen } from "~app/features/debts-transfer/debts-transfer-screen";
import type { UsersId } from "~db/models";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const fromIdState = useQueryState<UsersId>(
		"userId",
		parseAsString.withDefault(""),
	);
	const toIdState = useQueryState<UsersId>(
		"userId",
		parseAsString.withDefault(""),
	);
	return (
		<DebtsTransferScreen fromIdState={fromIdState} toIdState={toIdState} />
	);
};

export default Screen;
