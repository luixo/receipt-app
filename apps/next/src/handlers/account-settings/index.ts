import { t } from "next-app/handlers/trpc";

import { procedure as get } from "./get";
import { procedure as update } from "./update";

export const router = t.router({
	get,
	update,
});
