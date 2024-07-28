import type {
	InvalidateOptions,
	InvalidateQueryFilters,
	Query,
	SetDataOptions,
	UseInfiniteQueryResult,
	UseMutationResult,
	UseQueryResult,
} from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/react-query";
import { createTRPCReact } from "@trpc/react-query";
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
	ExtractObjectByPath,
	FlattenObject,
	SplitStringByComma,
	UnionToIntersection,
} from "~utils";
import type { router } from "~web/handlers";

export type AppRouter = typeof router;

type TypeKey = "queries" | "mutations";

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

// anything router-specific goes below

export const trpc = createTRPCReact<AppRouter>();

export type TRPCReact = typeof trpc;

export type TRPCReactUtils = ReturnType<(typeof trpc)["useUtils"]>;

export type TRPCError = TRPCClientErrorLike<AppRouter>;

type TRPCInfiniteQueryValues<P extends Record<string, AnyTRPCQueryProcedure>> =
	{
		[K in keyof P as inferProcedureInput<P[K]> extends { cursor?: unknown }
			? K
			: never]: P[K];
	};

export type TRPCQueryKey = keyof TRPCQueryValues & string;

export type TRPCSplitQueryKey<K extends TRPCQueryKey = TRPCQueryKey> =
	SplitStringByComma<K> & string[];

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
	UseInfiniteQueryResult<TRPCQueryOutput<Path>, TRPCError>;

export type TRPCInfiniteQuerySuccessResult<
	Path extends TRPCInfiniteQueryKey,
	Result extends TRPCInfiniteQueryResult<Path> = TRPCInfiniteQueryResult<Path>,
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

export type InvalidateArgs = [InvalidateQueryFilters?, InvalidateOptions?];
export type UpdateArgs = [SetDataOptions?];
