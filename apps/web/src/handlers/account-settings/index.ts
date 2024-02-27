import { t } from "~web/handlers/trpc";

import { procedure as get } from "./get";
import { procedure as update } from "./update";

export const router = t.router({
	get,
	update,
});
