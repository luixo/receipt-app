export const keys = <T extends Record<string, any>>(obj: T): (keyof T)[] =>
	Object.keys(obj);

export const values = <T extends Record<string, any>>(
	obj: T,
): NonNullable<T[keyof T]>[] => Object.values(obj);

export const entries = <T extends Record<string, any>>(
	obj: T,
): [keyof T, NonNullable<T[keyof T]>][] => Object.entries(obj);

export const mapObjectKeys = <Output, T extends Record<string, any>>(
	obj: T,
	mapper: (input: keyof T) => Output,
) =>
	keys(obj).reduce<Record<keyof T, Output>>(
		(acc, key) => ({ ...acc, [key]: mapper(key) }),
		{} as Record<keyof T, Output>,
	);

export const mapObjectValues = <Output, T extends Record<string, any>>(
	obj: T,
	mapper: (input: NonNullable<T[keyof T]>) => Output,
) =>
	entries(obj).reduce<Record<keyof T, Output>>(
		(acc, [key, input]) => ({ ...acc, [key]: mapper(input) }),
		{} as Record<keyof T, Output>,
	);
