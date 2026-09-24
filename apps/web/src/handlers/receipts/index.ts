import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getByPeerPaged } from "./get-by-peer-paged";
import { procedure as getPaged } from "./get-paged";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = {
	get,
	getPaged,
	getByPeerPaged,
	remove,
	add,
	update,
};
