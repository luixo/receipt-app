import { t } from "~web/handlers/trpc";

import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getByUsers } from "./get-by-users";
import { procedure as getIdsByUser } from "./get-ids-by-user";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = t.router({
	getByUsers,
	getIdsByUser,
	get,
	update,
	remove,
	add,
});
