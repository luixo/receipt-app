export const nonNullishGuard = <T>(
	arg: T
): arg is Exclude<T, null | undefined> => arg !== null && arg !== undefined;
