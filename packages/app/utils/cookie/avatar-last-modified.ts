import { z } from "zod";

import { fallback } from "app/utils/validation";

export const AVATAR_LAST_MODIFIED_KEY = "avatar:lastModified";

export const avatarLastModifiedSchema = z
	.number()
	.optional()
	.or(fallback(() => undefined));
