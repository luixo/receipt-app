import { t } from "~web/handlers/trpc";

import { procedure as getList } from "./get-list";
import { procedure as rates } from "./rates";
import { procedure as top } from "./top";

export const router = t.router({
	getList,
	top,
	rates,
});
