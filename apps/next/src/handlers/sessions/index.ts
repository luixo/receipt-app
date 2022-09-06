import { t } from "next-app/handlers/trpc";

import { procedure as cleanup } from "./cleanup";

export const router = t.router({
	cleanup,
});
