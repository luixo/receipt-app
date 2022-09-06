import {
	InvalidateOptions,
	InvalidateQueryFilters,
	QueryClient,
	SetDataOptions,
	UseInfiniteQueryResult,
	UseMutationResult,
	useQueryClient,
	UseQueryResult,
} from "@tanstack/react-query";
import type {
	DecoratedProcedureUtilsRecord,
	TRPCClientErrorLike,
} from "@trpc/react";
import { createTRPCReact } from "@trpc/react";
import type {
	AnyProcedure,
	QueryProcedure,
	MutationProcedure,
} from "@trpc/server/dist/core/procedure";
import type { ProcedureRecord, AnyRouter } from "@trpc/server/dist/core/router";
import type {
	inferProcedureInput,
	inferProcedureOutput,
} from "@trpc/server/dist/core/types";

import type {
	ExtractObjectByPath,
	FlattenObject,
	SplitStringByComma,
	UnionToIntersection,
} from "app/utils/types";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

type TypeKey = "queries" | "mutations";

type ProceduresValues<
	Router extends AnyRouter,
	Type extends TypeKey,
	Procedures extends Router["_def"]["procedures"] = Router["_def"]["procedures"],
	ProcedureKeys extends keyof Procedures = keyof Procedures
> = {
	[K in ProcedureKeys]: Procedures[K] extends AnyRouter
		? ProceduresValues<Procedures[K], Type>
		: Type extends "queries"
		? Procedures[K] extends QueryProcedure<any>
			? Procedures[K]
			: never
		: Procedures[K] extends MutationProcedure<any>
		? Procedures[K]
		: never;
};

type QueriesProcedureValues = ProceduresValues<AppRouter, "queries">;

type TRPCQueryValues = UnionToIntersection<
	FlattenObject<AnyProcedure, QueriesProcedureValues>
>;

type MutationsProcedureValues = ProceduresValues<AppRouter, "mutations">;

type TRPCMutationValues = UnionToIntersection<
	FlattenObject<AnyProcedure, MutationsProcedureValues>
>;

// anything router-specific goes below

const rawTrpc = createTRPCReact<AppRouter>();
export const trpc = new Proxy(rawTrpc, {
	get: (targetTrpc, propTrpc) => {
		if (propTrpc === "useContext") {
			const useContextResult = targetTrpc[propTrpc];
			return new Proxy(useContextResult, {
				apply: (useContextTarget, thisObj) => {
					// eslint-disable-next-line react-hooks/rules-of-hooks
					const queryClient = useQueryClient();
					const result = useContextTarget.apply(thisObj);
					return new Proxy(result as any, {
						get: (targetCtx, propCtx) => {
							if (propCtx === "queryClient") {
								return queryClient;
							}
							return targetCtx[propCtx as keyof typeof targetCtx];
						},
					});
				},
			});
		}
		return targetTrpc[propTrpc as keyof typeof targetTrpc];
	},
}) as Omit<typeof rawTrpc, "useContext"> & {
	useContext: () => TRPCReactContext;
};

export type TRPCError = TRPCClientErrorLike<AppRouter>;

export type TRPCSimpleReactContext = DecoratedProcedureUtilsRecord<AppRouter>;

export type TRPCReactContext = TRPCSimpleReactContext & {
	queryClient: QueryClient;
};

type TRPCInfiniteQueryValues<P extends ProcedureRecord> = {
	[K in keyof P as inferProcedureInput<P[K]> extends { cursor?: unknown }
		? K
		: never]: P[K];
};

export type TRPCQueryKey = keyof TRPCQueryValues & string;

export type TRPCQueryInput<Path extends TRPCQueryKey> = inferProcedureInput<
	TRPCQueryValues[Path]
>;

export type TRPCQueryOutput<Path extends TRPCQueryKey> = inferProcedureOutput<
	TRPCQueryValues[Path]
>;

export type TRPCQueryResult<Path extends TRPCQueryKey> = UseQueryResult<
	TRPCQueryOutput<Path>,
	TRPCError
>;

export type TRPCQuerySuccessResult<
	Path extends TRPCQueryKey,
	Result extends TRPCQueryResult<Path> = TRPCQueryResult<Path>
> = Result extends { status: "success" } ? Result : never;

export type TRPCQueryProcedures = DecoratedProcedureUtilsRecord<AppRouter>;

export type TRPCQueryProcedure<Path extends TRPCQueryKey> = ExtractObjectByPath<
	TRPCQueryProcedures,
	SplitStringByComma<Path>
>;

export type TRPCInfiniteQueryKey =
	keyof TRPCInfiniteQueryValues<TRPCQueryValues>;

export type TRPCInfiniteQueryInput<Path extends TRPCInfiniteQueryKey> = Omit<
	inferProcedureInput<TRPCQueryValues[Path]>,
	"cursor"
>;
export type TRPCInfiniteQueryOutput<Path extends TRPCInfiniteQueryKey> =
	inferProcedureOutput<TRPCQueryValues[Path]>;

export type TRPCInfiniteQueryCursor<Path extends TRPCInfiniteQueryKey> =
	inferProcedureInput<TRPCQueryValues[Path]> extends { cursor?: unknown }
		? inferProcedureInput<TRPCQueryValues[Path]>["cursor"]
		: never;

export type TRPCInfiniteQueryResult<Path extends TRPCQueryKey> =
	UseInfiniteQueryResult<TRPCQueryOutput<Path>, TRPCError>;

export type TRPCInfiniteQuerySuccessResult<
	Path extends TRPCInfiniteQueryKey,
	Result extends TRPCInfiniteQueryResult<Path> = TRPCInfiniteQueryResult<Path>
> = Result extends { status: "success" } ? Result : never;

export type TRPCMutationKey = keyof TRPCMutationValues;

export type TRPCMutationInput<Path extends TRPCMutationKey> =
	inferProcedureInput<TRPCMutationValues[Path]>;

export type TRPCMutationOutput<Path extends TRPCMutationKey> =
	inferProcedureOutput<TRPCMutationValues[Path]>;

export type TRPCMutationResult<Path extends TRPCMutationKey> =
	UseMutationResult<
		TRPCMutationOutput<Path>,
		TRPCError,
		TRPCMutationInput<Path>
	>;

export type AnyTRPCMutationResult = UseMutationResult<any, TRPCError, any>;

export type InvalidateArgs = [InvalidateQueryFilters?, InvalidateOptions?];
export type UpdateArgs = [SetDataOptions?];
