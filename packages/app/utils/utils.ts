export const nonNullishGuard = <T>(
	arg: T
): arg is Exclude<T, null | undefined> => arg !== null && arg !== undefined;

export const capitalize = <T extends string>(input: T): Capitalize<T> =>
	(input.slice(0, 1).toUpperCase() + input.slice(1)) as Capitalize<T>;

export const noop = () => {};
export const id = <T>(x: T): T => x;
