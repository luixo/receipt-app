import { z } from "zod/v4";

import { fallback } from "~app/utils/validation";
import { getNow } from "~utils/date";

export const TZ_OFFSET_STORE_NAME = "ssrContext:tzOffset";

export const getTimezoneOffset = () => getNow().getTimezoneOffset();

export const timezoneOffsetSchema = z.int().or(fallback(getTimezoneOffset));
