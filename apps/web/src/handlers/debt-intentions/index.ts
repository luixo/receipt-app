import { t } from "~web/handlers/trpc";

import { procedure as accept } from "./accept";
import { procedure as acceptAll } from "./accept-all";
import { procedure as getAll } from "./get-all";

export const router = t.router({
	getAll,
	accept,
	acceptAll,
});
