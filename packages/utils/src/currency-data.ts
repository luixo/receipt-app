import { codes, data } from "currency-codes";

import type { CurrencyCode } from "~app/utils/currency";

type CurrencyDescription = { code: CurrencyCode; name: string };

const bannedCodes = [
	// Silver
	"XAG",
	// Gold
	"XAU",
	// Bond Markets Unit European Composite Unit (EURCO)
	"XBA",
	// Bond Markets Unit European Monetary Unit (E.M.U.-6)
	"XBB",
	// Bond Markets Unit European Unit of Account 9 (E.U.A.-9)
	"XBC",
	// Bond Markets Unit European Unit of Account 17 (E.U.A.-17)
	"XBD",
	// SDR (Special Drawing Right)
	"XDR",
	// Palladium
	"XPD",
	// Platinum
	"XPT",
	// Sistema Unitario De Compensacion Regional De Pagos "Sucre"
	"XSU",
	// SDR (Special Drawing Right)
	"XDR",
	// Codes specifically reserved for testing purposes
	"XTS",
	// ADB Unit of Account
	"XUA",
	// The codes assigned for transactions where no currency is involved
	"XXX",
];
export const CURRENCY_CODES = codes().filter(
	(code) => !bannedCodes.includes(code),
);

export const getCurrencies = (): CurrencyDescription[] =>
	data.map(({ currency, code }) => ({ name: currency, code }));

export const getCurrency = (currencyCode: CurrencyCode) => {
	const currencies = getCurrencies();
	const matchedCurrency = currencies.find(({ code }) => code === currencyCode);
	if (!matchedCurrency) {
		throw new Error(`Currency ${currencyCode} does not exist in currencies`);
	}
	return matchedCurrency;
};
export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
