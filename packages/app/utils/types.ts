export type Setters<T> = {
	[K in keyof T as `change${Capitalize<string & K>}`]: (input: T[K]) => void;
};
