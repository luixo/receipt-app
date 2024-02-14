import { t } from "next-app/handlers/trpc";

import { procedure as add } from "./add";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = t.router({
	add,
	remove,
	update,
});
