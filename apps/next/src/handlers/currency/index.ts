import { t } from "next-app/handlers/trpc";

import { procedure as getList } from "./get-list";
import { procedure as rates } from "./rates";
import { procedure as topDebts } from "./top-debts";
import { procedure as topReceipts } from "./top-receipts";

export const router = t.router({
	getList,
	topReceipts,
	topDebts,
	rates,
});
