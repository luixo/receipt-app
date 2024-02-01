export const keys = <T extends Record<string, unknown>>(obj: T): (keyof T)[] =>
	Object.keys(obj);

export const values = <T extends Record<string, unknown>>(obj: T) =>
	Object.values(obj) as NonNullable<T[keyof T]>[];

export const entries = <T extends Record<string, unknown>>(obj: T) =>
	Object.entries(obj) as [keyof T, NonNullable<T[keyof T]>][];

export const mapObjectKeys = <Output, T extends Record<string, unknown>>(
	obj: T,
	mapper: (input: keyof T) => Output,
) =>
	keys(obj).reduce<Record<keyof T, Output>>(
		(acc, key) => ({ ...acc, [key]: mapper(key) }),
		{} as Record<keyof T, Output>,
	);

export const mapObjectValues = <Output, T extends Record<string, unknown>>(
	obj: T,
	mapper: (input: NonNullable<T[keyof T]>, key: keyof T) => Output,
) =>
	entries(obj).reduce<Record<keyof T, Output>>(
		(acc, [key, input]) => ({ ...acc, [key]: mapper(input, key) }),
		{} as Record<keyof T, Output>,
	);
