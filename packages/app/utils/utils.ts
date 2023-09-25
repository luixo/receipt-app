export const nonNullishGuard = <T>(
	arg: T,
): arg is Exclude<T, null | undefined> => arg !== null && arg !== undefined;

export const capitalize = <T extends string>(input: T): Capitalize<T> =>
	(input.slice(0, 1).toUpperCase() + input.slice(1)) as Capitalize<T>;

export const noop = (): undefined => undefined;
export const id = <T>(x: T): T => x;
export const alwaysTrue = () => true;

export const omitUndefined = <T extends object>(
	obj: T,
): Exclude<T, undefined> =>
	Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as Exclude<T, undefined>;
