export type Setters<T> = {
	[K in keyof T as `change${Capitalize<string & K>}`]: (input: T[K]) => void;
};

export type ExtractMapValue<T extends Map<unknown, unknown>> = T extends Map<
	unknown,
	infer V
>
	? V
	: never;
