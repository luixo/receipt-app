import type { CurrencyCode } from "~app/utils/currency";

const bannedCodes = new Set([
	// SDR (Special Drawing Right)
	"XDR",
]);

export const CURRENCY_CODES: CurrencyCode[] = Intl.supportedValuesOf(
	"currency",
).filter((code) => !bannedCodes.has(code));

export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
