import * as React from "react";

import { z } from "zod";

export const SSR_CONTEXT_COOKIE_NAME = "ssrContext";

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Intl {
		// see https://github.com/microsoft/TypeScript/issues/29129
		export function getCanonicalLocales(locales: string[]): string[];
	}
}

const ssrContextCookieDataSchema = z.strictObject({
	tzOffset: z.number().int(),
	locale: z.string().transform((value, ctx) => {
		try {
			const locales = Intl.getCanonicalLocales([value]);
			if (locales.length === 1) {
				return locales[0]!;
			}
		} catch (e) {
			if (e instanceof TypeError) {
				return value;
			}
		}
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Not a valid locale",
		});
		return z.NEVER;
	}),
});

// Data we save in cookie so returning user will have same timezone/locale on SSR and CSR
export type SSRContextCookieData = z.infer<typeof ssrContextCookieDataSchema>;

// The data above + data we add on each render
export type SSRContextData = SSRContextCookieData & {
	// Without this timestamp relative dates might differ on server and client
	// (e.g. "1 second ago" and "2 seconds ago")
	// which will cause hydration mismatch warning
	nowTimestamp: number;
};

// The data above + flag of whether it's first render
export type SSRContextType = SSRContextData & {
	isFirstRender: boolean;
};

export const getSSRContextCookieData = () => ({
	tzOffset: new Date().getTimezoneOffset(),
	locale: Intl.DateTimeFormat().resolvedOptions().locale,
});

export const getSSRContextData = (rawCookie?: string) => {
	let cookieData: Partial<SSRContextCookieData> | undefined;
	if (rawCookie) {
		try {
			const validatedData = ssrContextCookieDataSchema.safeParse(
				JSON.parse(rawCookie),
			);
			if (validatedData.success) {
				cookieData = validatedData.data;
			}
		} catch {
			/* empty */
		}
	}
	return {
		...getSSRContextCookieData(),
		...cookieData,
		nowTimestamp: Date.now(),
	};
};

export const SSRContext = React.createContext<SSRContextType>({
	...getSSRContextData(),
	isFirstRender: true,
});
