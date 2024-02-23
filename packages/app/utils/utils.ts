import type {
	MakeUndefinedOptional,
	RemoveCompletelyUndefined,
} from "app/utils/types";

export const nonNullishGuard = <T>(
	arg: T,
): arg is Exclude<T, null | undefined> => arg !== null && arg !== undefined;

export const capitalize = <T extends string>(input: T): Capitalize<T> =>
	(input.slice(0, 1).toUpperCase() + input.slice(1)) as Capitalize<T>;

export const noop = (): undefined => undefined;
export const id = <T>(x: T): T => x;
export const alwaysTrue = () => true;

export const omitUndefined = <T extends object>(obj: T) =>
	Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as RemoveCompletelyUndefined<MakeUndefinedOptional<T>>;

export const pick = <T extends { [s: string]: unknown }, K extends keyof T>(
	obj: T,
	keys: K[] | readonly K[],
): Pick<T, K> =>
	Object.fromEntries(
		Object.entries(obj).filter(([key]) => keys.includes(key as K)),
	) as Pick<T, K>;

export const wait = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

export const createPromise = <R, E = unknown>() => {
	let resolve: ((result: R) => void) | undefined;
	let reject: ((reason?: E) => void) | undefined;
	const promise = new Promise<R>((resolveFn, rejectFn) => {
		resolve = resolveFn;
		reject = rejectFn;
	});
	return { resolve: resolve!, reject: reject!, wait: () => promise };
};
export type ControlledPromise<R = void, E = unknown> = ReturnType<
	typeof createPromise<R, E>
>;

type TupleOf<T, N extends number> = N extends N
	? number extends N
		? T[]
		: InnerTupleOf<T, N, []>
	: never;
type InnerTupleOf<
	T,
	N extends number,
	R extends unknown[],
> = R["length"] extends N ? R : InnerTupleOf<T, N, [T, ...R]>;

export const asFixedSizeArray =
	<N extends number>() =>
	<T>(array: T[]) =>
		array as TupleOf<T, N>;

export const updateSetStateAction = <T>(
	setStateAction: React.SetStateAction<T>,
	prevValue: T,
) =>
	typeof setStateAction === "function"
		? (setStateAction as (prevState: T) => T)(prevValue)
		: setStateAction;
