import React from "react";

import { InfiniteData } from "@tanstack/react-query";

import {
	InvalidateArgs,
	UpdateArgs,
	TRPCInfiniteQueryKey,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCQueryProcedure,
	TRPCReactContext,
} from "app/trpc";

export type Revert<T> = (input: T) => T;

export type ExtractInfiniteData<T> = T extends InfiniteData<infer X>
	? X
	: never;

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
	...[procedure, input]: undefined extends TRPCQueryInput<Path>
		? [TRPCQueryProcedure<Path>, TRPCQueryInput<Path>?]
		: [TRPCQueryProcedure<Path>, TRPCQueryInput<Path>]
): Controller<TRPCQueryOutput<Path>> => ({
	get: () => procedure.getData(input as any),
	set: (data, options) => (procedure.setData as any)(data, input, options),
	update: (updater, options) => {
		if (procedure.getData(input as any) === undefined) {
			return;
		}
		return (procedure.setData as any)(
			(prev: any) => (prev === undefined ? prev : updater(prev)),
			input,
			options
		);
	},
	invalidate: (filters, options) =>
		procedure.invalidate(input as any, filters, options),
});

export const createGenericBroadController = <Path extends TRPCQueryKey>(
	trpc: TRPCReactContext,
	path: Path
): Controller<
	[[Path, TRPCQueryInput<Path>], TRPCQueryOutput<Path>][],
	[TRPCQueryInput<Path>, TRPCQueryOutput<Path>],
	TRPCQueryOutput<Path>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData([path]) as [
			[Path, TRPCQueryInput<Path>],
			TRPCQueryOutput<Path>
		][],
	set: (data, options) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum);
		}, options);
	},
	update: (updater, options) => {
		const queries = trpc.queryClient.getQueriesData([path]) as [
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
		trpc.queryClient.invalidateQueries([path], filters, options),
});

export const createGenericInfiniteBroadController = <
	Path extends TRPCInfiniteQueryKey
>(
	trpc: TRPCReactContext,
	path: Path
): Controller<
	[[Path, TRPCQueryInput<Path>], InfiniteData<TRPCQueryOutput<Path>>][],
	[TRPCQueryInput<Path>, InfiniteData<TRPCQueryOutput<Path>>],
	InfiniteData<TRPCQueryOutput<Path>>
> => ({
	get: () =>
		trpc.queryClient.getQueriesData([path]) as [
			[Path, TRPCQueryInput<Path>],
			InfiniteData<TRPCQueryOutput<Path>>
		][],
	set: (data, options) => {
		data.forEach(([queryKey, datum]) => {
			trpc.queryClient.setQueryData(queryKey, datum, options);
		});
	},
	update: (updater, options) => {
		const queries = trpc.queryClient.getQueriesData([path]) as [
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
		trpc.queryClient.invalidateQueries([path], filters, options),
});

export const createRef = <T>(
	...args: undefined extends T ? [] : [T]
): React.MutableRefObject<T> => ({ current: args[0]! });
