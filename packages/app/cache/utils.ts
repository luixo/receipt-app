import React from "react";

import { InfiniteData } from "react-query";

import {
	TRPCInfiniteQueryKey,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";

export type Revert<T> = (input: T) => T;

type Controller<Data> = {
	get: () => Data | undefined;
	set: (nextData: Data) => void;
	update: (updater: (prevData: Data) => Data) => void;
	invalidate: () => void;
};

// TODO: fix anys

export const createGenericController = <Path extends TRPCQueryKey>(
	trpc: TRPCReactContext,
	pathAndInput: undefined extends TRPCQueryInput<Path>
		? [Path]
		: [Path, TRPCQueryInput<Path>]
): Controller<TRPCQueryOutput<Path>> => ({
	get: () => trpc.getQueryData(pathAndInput) as any,
	set: (data) => trpc.setQueryData(pathAndInput, data as any),
	update: (updater) =>
		trpc.setQueryData(pathAndInput, (prev: any) =>
			prev === undefined ? prev : updater(prev)
		),
	invalidate: () => trpc.invalidateQueries(pathAndInput),
});

export const createGenericInfiniteController = <
	Path extends TRPCInfiniteQueryKey
>(
	trpc: TRPCReactContext,
	pathAndInput: undefined extends TRPCQueryInput<Path>
		? [Path]
		: [Path, TRPCQueryInput<Path>]
): Controller<InfiniteData<TRPCQueryOutput<Path>>> => ({
	get: () => trpc.getInfiniteQueryData(pathAndInput as any),
	set: (data) => trpc.setInfiniteQueryData(pathAndInput, data as any),
	update: (updater) =>
		trpc.setInfiniteQueryData(pathAndInput, (prev: any) =>
			prev === undefined ? prev : updater(prev)
		),
	invalidate: () => trpc.invalidateQueries(pathAndInput),
});

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });
