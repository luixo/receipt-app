import { procedure as add } from "./add";
import { procedure as cleanup } from "./cleanup";
import { procedure as get } from "./get";

export const router = {
	get,
	add,
	cleanup,
};
