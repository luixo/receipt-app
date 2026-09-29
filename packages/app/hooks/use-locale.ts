import { useSsrValue } from "#app/hooks/use-ssr-value.ts";
import { LOCALE_STORE_NAME } from "#app/utils/store/locale.ts";

export const useLocale = () => {
	const [locale] = useSsrValue(LOCALE_STORE_NAME);
	return locale;
};
