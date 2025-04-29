import { data } from "currency-codes";

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

export const CURRENCIES: CurrencyDescription[] = data
	.filter(({ code }) => !bannedCodes.includes(code))
	.map(({ currency, code }) => ({ name: currency, code }));

export const CURRENCY_CODES = CURRENCIES.map(({ code }) => code);

export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
