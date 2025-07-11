import { z } from "zod/v4";

import { fallback } from "~app/utils/validation";

export const TIMEZONE_STORE_NAME = "ssrContext:timezone";

export const getTimezone = () =>
	Intl.DateTimeFormat().resolvedOptions().timeZone;

export const timezoneSchema = z.string().or(fallback(getTimezone));
