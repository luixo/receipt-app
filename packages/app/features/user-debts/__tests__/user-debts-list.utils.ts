export const debtsWithDividers = [
	// unresolved currency that happened before resolve currency
	{
		currencyCode: "GBP",
		amount: 7.5,
		notResolved: true,
	},
	// verify an old USD resolution will get a divider
	{
		currencyCode: "USD",
		amount: 10,
	},
	{
		currencyCode: "USD",
		amount: -10,
	},
	{ dividerCurrencyCode: "USD" },
	// verify a EUR resolution with more than 2 debts get a divider
	{
		currencyCode: "EUR",
		amount: 5,
	},
	{
		currencyCode: "EUR",
		amount: -4,
	},
	{
		currencyCode: "EUR",
		amount: -1,
	},
	{ dividerCurrencyCode: "EUR" },
	// verify another USD resolution
	{
		currencyCode: "USD",
		amount: -5,
	},
	{
		currencyCode: "USD",
		amount: 5,
	},
	{ dividerCurrencyCode: "USD" },
	// verify non-resolved debts
	{
		currencyCode: "CNY",
		amount: 100,
		notResolved: true,
	},
	{
		currencyCode: "CNY",
		amount: -90,
		notResolved: true,
	},
	// verify mixed resolution
	{
		currencyCode: "USD",
		amount: -5,
	},
	// unresolved debt of previously resolved currency
	{
		currencyCode: "EUR",
		amount: 10,
		notResolved: true,
	},
	{
		currencyCode: "USD",
		amount: 5,
	},
	{ dividerCurrencyCode: "USD" },
] as const;
