import { procedure as accept } from "./accept";
import { procedure as add } from "./add";
import { procedure as getAll } from "./get-all";
import { procedure as reject } from "./reject";
import { procedure as remove } from "./remove";

export const router = {
	getAll,
	add,
	remove,
	accept,
	reject,
};
