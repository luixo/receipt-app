import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getAll } from "./get-all";
import { procedure as getAllUser } from "./get-all-user";
import { procedure as getByUserPaged } from "./get-by-user-paged";
import { procedure as getUsersPaged } from "./get-users-paged";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = {
	getAll,
	getAllUser,
	getUsersPaged,
	getByUserPaged,
	get,
	update,
	remove,
	add,
};
