import type { CurrencyCode } from "~app/utils/currency";

const bannedCodes = [
	// SDR (Special Drawing Right)
	"XDR",
];

export const CURRENCY_CODES: CurrencyCode[] = Intl.supportedValuesOf(
	"currency",
).filter((code) => !bannedCodes.includes(code));

export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
