export type ParsedQuery = Partial<Record<string, string>>;

export type Setters<T> = Required<{
	[K in keyof T as `change${Capitalize<string & K>}`]: (
		input: T[K] | ((prev: T[K]) => T[K]),
	) => void;
}>;
