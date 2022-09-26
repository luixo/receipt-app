export type Setters<T> = {
	[K in keyof T as `change${Capitalize<string & K>}`]: (input: T[K]) => void;
};

export type SplitStringByComma<S extends string> =
	S extends `${infer SS}.${infer SSS}` ? [SS, ...SplitStringByComma<SSS>] : [S];

type ExtractObj<S extends object, K> = K extends keyof S ? S[K] : never;

export type ExtractObjectByPath<
	S extends object,
	T extends unknown[]
> = T extends [infer T0, ...infer TR]
	? TR extends []
		? ExtractObj<S, T0> extends never
			? never
			: ExtractObj<S, T0>
		: ExtractObj<S, T0> extends object
		? ExtractObjectByPath<ExtractObj<S, T0>, TR>
		: ExtractObj<S, T0> extends never
		? never
		: ExtractObj<S, T0>
	: never;

// https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type/50375286#50375286
export type UnionToIntersection<U> = (
	U extends any ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

export type FlattenObject<
	Terminator,
	T extends Record<string, unknown>,
	PrevKey extends string = "",
	Key = keyof T
> = Key extends string
	? T[Key] extends never
		? never
		: T[Key] extends Terminator
		? {
				[K in PrevKey extends "" ? `${Key}` : `${PrevKey}.${Key}`]: T[Key];
		  }
		: T[Key] extends Record<string, unknown>
		? FlattenObject<
				Terminator,
				T[Key],
				PrevKey extends "" ? `${Key}` : `${PrevKey}.${Key}`
		  >
		: never
	: never;

export type MaybeAddElementToArray<
	Args extends unknown[],
	X = undefined
> = undefined extends X ? Args : [...Args, X];
