import { t } from "next-app/handlers/trpc";

import { procedure as add } from "./add";
import { procedure as addBatch } from "./add-batch";
import { procedure as get } from "./get";
import { procedure as getByUsers } from "./get-by-users";
import { procedure as getUser } from "./get-user";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = t.router({
	getByUsers,
	getUser,
	get,
	update,
	remove,
	add,
	addBatch,
});
