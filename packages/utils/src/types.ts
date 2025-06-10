export type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

export type ParametersExceptFirst<F> = F extends (
	arg0: unknown,
	...rest: infer R
) => unknown
	? R
	: never;

export type SplitStringByComma<S extends string> =
	S extends `${infer SS}.${infer SSS}` ? [SS, ...SplitStringByComma<SSS>] : [S];

type ExtractObj<S extends object, K> = K extends keyof S ? S[K] : never;

type NonNullableFields<T> = {
	[P in keyof T]: NonNullable<T[P]>;
};
export type NonNullableField<T, K extends keyof T> = T &
	NonNullableFields<Pick<T, K>>;

export type ExtractObjectByPath<
	S extends object,
	T extends unknown[],
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
	U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

export type FlattenObject<
	Terminator,
	T extends Record<string, unknown>,
	PrevKey extends string = "",
	Key = keyof T,
> = Key extends string
	? T[Key] extends never
		? never
		: T[Key] extends Terminator
		? Record<PrevKey extends "" ? `${Key}` : `${PrevKey}.${Key}`, T[Key]>
		: T[Key] extends Record<string, unknown>
		? FlattenObject<
				Terminator,
				T[Key],
				PrevKey extends "" ? `${Key}` : `${PrevKey}.${Key}`
		  >
		: never
	: never;

export type Exact<A, B> = (<T>() => T extends A ? 1 : 0) extends <
	T,
>() => T extends B ? 1 : 0
	? A extends B
		? B extends A
			? unknown
			: never
		: never
	: never;

export type MaybeAddElementToArray<
	Args extends unknown[],
	X = undefined,
> = Exact<X, undefined> extends never
	? X extends undefined
		? [...Args, X?]
		: [...Args, X]
	: Args;

export type KeysMatching<T extends object, V> = {
	[K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

export type AddParameters<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Fn extends (...args: any) => unknown,
	AddedParameters extends [...args: unknown[]],
> = (...args: [...Parameters<Fn>, ...AddedParameters]) => ReturnType<Fn>;

export type Tail<T extends unknown[]> = T extends [unknown, ...infer R]
	? R
	: never;

type MaybeUndefinedProps<T extends object> = {
	[K in keyof T as undefined extends T[K] ? K : never]?: T[K];
};

export type MakeUndefinedOptional<T extends object> = MaybeUndefinedProps<T> &
	Omit<T, keyof MaybeUndefinedProps<T>>;

export type TupleOf<T, N extends number> = N extends N
	? number extends N
		? T[]
		: InnerTupleOf<T, N, []>
	: never;
type InnerTupleOf<
	T,
	N extends number,
	R extends unknown[],
> = R["length"] extends N ? R : InnerTupleOf<T, N, [T, ...R]>;

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type NullableObject<T> =
	| {
			[K in keyof T]: T[K];
	  }
	| {
			[K in keyof T]: null;
	  };

export type MappedNullableObject<
	T,
	KeyMapping extends Record<string, keyof T>,
> = NullableObject<{
	[K in keyof KeyMapping]: T[KeyMapping[K]];
}>;

export type MaybePromise<T> = T | Promise<T>;
