import { t } from "~web/handlers/trpc";

import { procedure as pingCache } from "./ping-cache";

export const router = t.router({
	pingCache,
});
