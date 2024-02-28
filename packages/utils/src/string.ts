export const capitalize = <T extends string>(input: T): Capitalize<T> =>
	(input.slice(0, 1).toUpperCase() + input.slice(1)) as Capitalize<T>;
