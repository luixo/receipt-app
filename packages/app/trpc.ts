import type {
	InfiniteData,
	InvalidateOptions,
	InvalidateQueryFilters,
	Mutation,
	MutationState,
	Query,
	SetDataOptions,
	UseInfiniteQueryResult,
	UseMutationResult,
	UseQueryResult,
} from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/react-query";
import type { UtilsLike } from "@trpc/react-query/shared";
import type {
	AnyTRPCMutationProcedure,
	AnyTRPCProcedure,
	AnyTRPCQueryProcedure,
	AnyTRPCRouter,
	inferProcedureInput,
	inferProcedureOutput,
} from "@trpc/server";
import type {
	DecorateRouterKeyable,
	ExtractCursorType,
	TRPCOptionsProxy,
} from "@trpc/tanstack-react-query";

import type { useTRPC } from "~app/utils/trpc";
import type {
	ExtractObjectByPath,
	FlattenObject,
	OmitDeep,
	SplitStringByComma,
	UnionToIntersection,
} from "~utils/types";
import type { router } from "~web/handlers";

export type AppRouter = typeof router;

type TypeKey = "queries" | "mutations";

type TRPCOptionsProxyNoPath<TRouter extends AnyTRPCRouter> = OmitDeep<
	TRPCOptionsProxy<TRouter>,
	{ "~types": unknown },
	keyof DecorateRouterKeyable
>;

type ProceduresValues<
	Router extends AnyTRPCRouter,
	Type extends TypeKey,
	Procedures extends
		Router["_def"]["procedures"] = Router["_def"]["procedures"],
	ProcedureKeys extends keyof Procedures = keyof Procedures,
> = {
	[K in ProcedureKeys]: Procedures[K] extends AnyTRPCQueryProcedure
		? Type extends "queries"
			? Procedures[K]
			: never
		: Procedures[K] extends AnyTRPCMutationProcedure
		? Type extends "mutations"
			? Procedures[K]
			: never
		: ProceduresValues<Procedures[K], Type, Procedures[K]>;
};

type QueriesProcedureValues = ProceduresValues<AppRouter, "queries">;

type TRPCQueryValues = UnionToIntersection<
	FlattenObject<AnyTRPCProcedure, QueriesProcedureValues>
>;

type MutationsProcedureValues = ProceduresValues<AppRouter, "mutations">;

type TRPCMutationValues = UnionToIntersection<
	FlattenObject<AnyTRPCProcedure, MutationsProcedureValues>
>;

export type TRPCTanstackGenericQueryKey<
	P extends string = string,
	I = unknown,
> = [SplitStringByComma<P>, { input: I; type: "query" }];

// anything router-specific goes below

export type TRPCError = TRPCClientErrorLike<AppRouter>;

type TRPCInfiniteQueryValues<P extends Record<string, AnyTRPCQueryProcedure>> =
	{
		[K in keyof P as inferProcedureInput<P[K]> extends { cursor?: unknown }
			? K
			: never]: P[K];
	};

export type TRPCQueryKey = keyof TRPCQueryValues;

export type TRPCSplitQueryKey<K extends TRPCQueryKey = TRPCQueryKey> =
	SplitStringByComma<K>;

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
	Result extends TRPCQueryResult<Path> = TRPCQueryResult<Path>,
> = Result extends { status: "success" } ? Result : never;

export type TRPCQueryErrorResult<
	Path extends TRPCQueryKey,
	Result extends TRPCQueryResult<Path> = TRPCQueryResult<Path>,
> = Result extends { status: "error" } ? Result : never;

export type TRPCQuery<K extends TRPCQueryKey> = Query<
	TRPCQueryOutput<K>,
	TRPCError,
	TRPCQueryOutput<K>,
	readonly [
		Readonly<TRPCSplitQueryKey<K>>,
		TRPCQueryInput<K> extends undefined
			? undefined
			: { input: TRPCQueryInput<K>; type: "infinite" | "query" },
	]
>;

export type TRPCQueryProcedures = UtilsLike<AppRouter>;

export type TRPCQueryProcedure<Path extends TRPCQueryKey> = ExtractObjectByPath<
	TRPCQueryProcedures,
	TRPCSplitQueryKey<Path>
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
	UseInfiniteQueryResult<
		InfiniteData<
			TRPCQueryOutput<Path>,
			NonNullable<ExtractCursorType<TRPCQueryInput<Path>>> | null
		>,
		TRPCError
	>;

export type TRPCInfiniteQuerySuccessResult<
	Path extends TRPCInfiniteQueryKey,
	Result extends TRPCInfiniteQueryResult<Path> = TRPCInfiniteQueryResult<Path>,
> = Result extends { status: "success" } ? Result : never;

export type TRPCTanstackQueryKey<K extends TRPCQueryKey> =
	TRPCTanstackGenericQueryKey<K, TRPCQueryInput<K>>;

export type TRPCMutationKey = keyof TRPCMutationValues;

export type TRPCSplitMutationKey<K extends TRPCMutationKey = TRPCMutationKey> =
	SplitStringByComma<K> & string[];

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

export type TRPCMutation<Path extends TRPCMutationKey> = Mutation<
	TRPCMutationOutput<Path>,
	TRPCError,
	TRPCMutationInput<Path>
>;

export type TRPCMutationState<Path extends TRPCMutationKey> = MutationState<
	TRPCMutationOutput<Path>,
	TRPCError,
	TRPCMutationInput<Path>
>;

export type TRPCTanstackMutationKey<K extends TRPCMutationKey> = [
	SplitStringByComma<K>,
];

export type InvalidateArgs = [InvalidateQueryFilters?, InvalidateOptions?];
export type UpdateArgs = [SetDataOptions?];

export type Utils = ReturnType<typeof useTRPC>;

type TRPCDecoratedQueryProcedures = UnionToIntersection<
	FlattenObject<{ "~types": unknown }, TRPCOptionsProxyNoPath<AppRouter>>
>;
export type TRPCDecoratedQueryProcedure<K extends TRPCQueryKey> =
	TRPCDecoratedQueryProcedures[K];
export type TRPCDecoratedInfiniteQueryProcedure<
	K extends TRPCInfiniteQueryKey,
> = TRPCDecoratedQueryProcedures[K];
