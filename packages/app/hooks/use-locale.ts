import { useSsrValue } from "~app/hooks/use-ssr-value";
import { LOCALE_STORE_NAME } from "~app/utils/store/locale";

export const useLocale = () => {
	const [locale] = useSsrValue(LOCALE_STORE_NAME);
	return locale;
};
