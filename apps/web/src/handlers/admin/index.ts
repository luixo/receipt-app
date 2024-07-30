import { t } from "~web/handlers/trpc";

import { procedure as accounts } from "./accounts";

export const router = t.router({
	accounts,
});
