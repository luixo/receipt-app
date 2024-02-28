import type { UpdateFn } from "~app/cache/utils";

export type Setters<T> = Required<{
	[K in keyof T as `change${Capitalize<string & K>}`]: (
		input: T[K] | UpdateFn<T[K]>,
	) => void;
}>;
