import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getAll } from "./get-all";
import { procedure as getAllUser } from "./get-all-user";
import { procedure as getByUsers } from "./get-by-users";
import { procedure as getIdsByUser } from "./get-ids-by-user";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = {
	getAll,
	getAllUser,
	getByUsers,
	getIdsByUser,
	get,
	update,
	remove,
	add,
};
