import type { createStore } from "app/utils/store";

import * as receipts from "./receipts";
import * as users from "./users";

export const queries = {
	users,
	receipts,
};

export const inputs: ReturnType<typeof createStore>[] = [
	queries.users.getPaged.inputStore,
	queries.receipts.getPaged.inputStore,
];
