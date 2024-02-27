import { t } from "~web/handlers/trpc";

import { procedure as cleanup } from "./cleanup";

export const router = t.router({
	cleanup,
});
