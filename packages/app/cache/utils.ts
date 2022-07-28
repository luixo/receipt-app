import React from "react";

import { InfiniteData } from "react-query";

import {
	InvalidateArgs,
	UpdateArgs,
	TRPCInfiniteQueryKey,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";

export type Revert<T> = (input: T) => T;

type Controller<Data, UpdaterInput = Data, UpdaterOutput = UpdaterInput> = {
	get: () => Data | undefined;
	set: (nextData: Data, ...args: UpdateArgs) => void;
	update: (
		updater: (prevData: UpdaterInput) => UpdaterOutput,
		...args: UpdateArgs
	) => void;
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
	set: (data, options) => trpc.setQueryData(pathAndInput, data as any, options),
	update: (updater, options) =>
		trpc.setQueryData(
			pathAndInput,
			(prev: any) => (prev === undefined ? prev : updater(prev)),
			options
		),
	invalidate: (filters, options) =>
		trpc.invalidateQueries(pathAndInput, filters, options),
});

export const createGenericBroadController = <Path extends TRPCQueryKey>(
	trpc: TRPCReactContext,
	pathAndInput: undefined extends TRPCQueryInput<Path>
		? [Path]
		: [Path, TRPCQueryInput<Path>?]
): Controller<
	[[Path, TRPCQueryInput<Path>], TRPCQueryOutput<Path>][],
	[TRPCQueryInput<Path>, TRPCQueryOutput<Path>],
	TRPCQueryOutput<Path>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData(pathAndInput) as [
			[Path, TRPCQueryInput<Path>],
			TRPCQueryOutput<Path>
		][],
	set: (data, options) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum);
		}, options);
	},
	update: (updater, options) => {
		const queries = trpc.queryClient.getQueriesData(pathAndInput) as [
			[Path, TRPCQueryInput<Path>],
			TRPCQueryOutput<Path>
		][];
		queries.forEach(([[actualPath, input], prevData]) => {
			if (!prevData) {
				return;
			}
			trpc.queryClient.setQueryData(
				[actualPath, input],
				updater([input, prevData]),
				options
			);
		});
	},
	invalidate: (filters, options) =>
		trpc.queryClient.invalidateQueries(pathAndInput, filters, options),
});

export const createGenericInfiniteBroadController = <
	Path extends TRPCInfiniteQueryKey
>(
	trpc: TRPCReactContext,
	pathAndInput: undefined extends TRPCQueryInput<Path>
		? [Path]
		: [Path, Partial<TRPCQueryInput<Path>>?]
): Controller<
	[[Path, TRPCQueryInput<Path>], InfiniteData<TRPCQueryOutput<Path>>][],
	[TRPCQueryInput<Path>, InfiniteData<TRPCQueryOutput<Path>>],
	InfiniteData<TRPCQueryOutput<Path>>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData(pathAndInput) as [
			[Path, TRPCQueryInput<Path>],
			InfiniteData<TRPCQueryOutput<Path>>
		][],
	set: (data, options) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum, options);
		});
	},
	update: (updater, options) => {
		const queries = trpc.queryClient.getQueriesData(pathAndInput) as [
			[Path, TRPCQueryInput<Path>],
			InfiniteData<TRPCQueryOutput<Path>>
		][];
		queries.forEach(([[actualPath, input], prevData]) => {
			if (!prevData) {
				return;
			}
			trpc.queryClient.setQueryData(
				[actualPath, input],
				updater([input, prevData]),
				options
			);
		});
	},
	invalidate: (filters, options) =>
		trpc.queryClient.invalidateQueries(pathAndInput, filters, options),
});

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });
