import { z } from "zod";

import { fallback } from "~app/utils/validation";

export const TZ_OFFSET_COOKIE_NAME = "ssrContext:tzOffset";

export const getTimezoneOffset = () => new Date().getTimezoneOffset();

export const timezoneOffsetSchema = z
	.number()
	.int()
	.or(fallback(getTimezoneOffset));
