export const nonNullishGuard = <T>(
	arg: T,
): arg is Exclude<T, null | undefined> => arg !== null && arg !== undefined;

export const noop = (): undefined => undefined;
export const id = <T>(x: T): T => x;
export const alwaysTrue = () => true;
