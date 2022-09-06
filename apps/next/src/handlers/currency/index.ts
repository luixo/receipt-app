import { t } from "next-app/handlers/trpc";

import { procedure as getList } from "./get-list";

export const router = t.router({
	getList,
});
