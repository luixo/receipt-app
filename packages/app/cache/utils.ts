import React from "react";

import { InfiniteData } from "react-query";

import {
	InvalidateArgs,
	TRPCInfiniteQueryKey,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";

export type Revert<T> = (input: T) => T;

type Controller<Data, UpdaterInput = Data, UpdaterOutput = UpdaterInput> = {
	get: () => Data | undefined;
	set: (nextData: Data) => void;
	update: (updater: (prevData: UpdaterInput) => UpdaterOutput) => void;
	invalidate: (...args: InvalidateArgs) => void;
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
	invalidate: (filters, options) =>
		trpc.invalidateQueries(pathAndInput, filters, options),
});

export const createGenericBroadController = <Path extends TRPCQueryKey>(
	trpc: TRPCReactContext,
	path: [Path]
): Controller<
	[[Path, TRPCQueryInput<Path>], TRPCQueryOutput<Path>][],
	[TRPCQueryInput<Path>, TRPCQueryOutput<Path>],
	TRPCQueryOutput<Path>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData(path) as [
			[Path, TRPCQueryInput<Path>],
			TRPCQueryOutput<Path>
		][],
	set: (data) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum);
		});
	},
	update: (updater) => {
		const queries = trpc.queryClient.getQueriesData(path) as [
			[Path, TRPCQueryInput<Path>],
			TRPCQueryOutput<Path>
		][];
		queries.forEach(([[actualPath, input], prevData]) => {
			if (!prevData) {
				return;
			}
			trpc.queryClient.setQueryData(
				[actualPath, input],
				updater([input, prevData])
			);
		});
	},
	invalidate: (filters, options) =>
		trpc.queryClient.invalidateQueries(path, filters, options),
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

export const createGenericInfiniteBroadController = <
	Path extends TRPCInfiniteQueryKey
>(
	trpc: TRPCReactContext,
	path: [Path]
): Controller<
	[[Path, TRPCQueryInput<Path>], InfiniteData<TRPCQueryOutput<Path>>][],
	[TRPCQueryInput<Path>, InfiniteData<TRPCQueryOutput<Path>>],
	InfiniteData<TRPCQueryOutput<Path>>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData(path) as [
			[Path, TRPCQueryInput<Path>],
			InfiniteData<TRPCQueryOutput<Path>>
		][],
	set: (data) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum);
		});
	},
	update: (updater) => {
		const queries = trpc.queryClient.getQueriesData(path) as [
			[Path, TRPCQueryInput<Path>],
			InfiniteData<TRPCQueryOutput<Path>>
		][];
		queries.forEach(([[actualPath, input], prevData]) => {
			if (!prevData) {
				return;
			}
			trpc.queryClient.setQueryData(
				[actualPath, input],
				updater([input, prevData])
			);
		});
	},
	invalidate: (filters, options) =>
		trpc.queryClient.invalidateQueries(path, filters, options),
});

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });
