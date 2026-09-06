import { keys } from "remeda";
import z from "zod";

import { languages } from "~app/utils/i18n-data";
import type { Language } from "~app/utils/i18n-data";
import { fallback } from "~app/utils/validation";

export const LANGUAGE_STORE_NAME = "ssrContext:language";

export const getLanguage = (): Language => "en";

export const languageSchema = z
	.literal(keys(languages))
	.or(fallback((): Language => "en"));
