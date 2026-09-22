import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getForeign } from "./get-foreign";
import { procedure as getPaged } from "./get-paged";
import { procedure as remove } from "./remove";
import { procedure as suggest } from "./suggest";
import { procedure as suggestTop } from "./suggest-top";
import { procedure as unlink } from "./unlink";
import { procedure as update } from "./update";

export const router = {
	get,
	getForeign,
	getPaged,
	add,
	remove,
	update,
	unlink,
	suggest,
	suggestTop,
};
