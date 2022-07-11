import { createReactQueryHooks, TRPCClientErrorLike } from "@trpc/react";
import { TRPCContextState } from "@trpc/react/dist/declarations/src/internals/context";
import { Procedure } from "@trpc/server/dist/declarations/src/internals/procedure";
import {
	Router,
	ProcedureRecord,
} from "@trpc/server/dist/declarations/src/router";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import {
	UseInfiniteQueryResult,
	UseMutationResult,
	UseQueryResult,
} from "react-query";

type AnyRouter<TContext = any> = Router<any, TContext, any, any, any, any, any>;
type AnyProcedure = Procedure<any, any, any, any, any, any, any>;
type AnyProcedureRecord = ProcedureRecord<any, any, any, any, any, any>;

type InferProcedureInput<P extends AnyProcedure> = P extends Procedure<
	any,
	any,
	any,
	infer Input,
	any,
	any,
	any
>
	? undefined extends Input
		? Input | null | void
		: Input
	: undefined;

type InferProcedureOutput<P extends AnyProcedure> = Awaited<
	ReturnType<P["call"]>
>;

type InferProcedures<Obj extends AnyProcedureRecord> = {
	[Path in keyof Obj]: {
		input: InferProcedureInput<Obj[Path]>;
		output: InferProcedureOutput<Obj[Path]>;
	};
};

type TypeKey = "queries" | "mutations";

type DefValues<
	Router extends AnyRouter,
	Type extends TypeKey
> = InferProcedures<Router["_def"][Type]>;

type DefKey<
	Router extends AnyRouter,
	Type extends TypeKey
> = keyof Router["_def"][Type];

type InferInfiniteQueryNames<
	TObj extends ProcedureRecord<any, any, any, any, any, any>
> = {
	[TPath in keyof TObj]: InferProcedureInput<TObj[TPath]> extends {
		cursor?: any;
	}
		? TPath
		: never;
}[keyof TObj];

type InfiniteQueryNames<
	Router extends AnyRouter,
	Type extends TypeKey
> = InferInfiniteQueryNames<Router["_def"][Type]>;

// anything router-specific goes below

export const trpc = createReactQueryHooks<AppRouter>();

export type TRPCError = TRPCClientErrorLike<AppRouter>;

export type TRPCReactContext = TRPCContextState<AppRouter, unknown>;

export type TRPCQueryKey = DefKey<AppRouter, "queries">;

type TRPCQueryValues = DefValues<AppRouter, "queries">;

export type TRPCQueryInput<Path extends TRPCQueryKey> =
	TRPCQueryValues[Path]["input"];

export type TRPCQueryOutput<Path extends TRPCQueryKey> =
	TRPCQueryValues[Path]["output"];

export type TRPCQueryResult<Path extends TRPCQueryKey> = UseQueryResult<
	TRPCQueryOutput<Path>,
	TRPCError
>;

export type TRPCInfiniteQueryKey = InfiniteQueryNames<AppRouter, "queries">;

export type TRPCInfiniteQueryInput<Path extends TRPCInfiniteQueryKey> = Omit<
	TRPCQueryValues[Path]["input"],
	"cursor"
>;

export type TRPCInfiniteQueryResult<Path extends TRPCQueryKey> =
	UseInfiniteQueryResult<TRPCQueryOutput<Path>, TRPCError>;

export type TRPCMutationKey = DefKey<AppRouter, "mutations">;

type TRPCMutationValues = DefValues<AppRouter, "mutations">;

export type TRPCMutationInput<Path extends TRPCMutationKey> =
	TRPCMutationValues[Path]["input"];

export type TRPCMutationOutput<Path extends TRPCMutationKey> =
	TRPCMutationValues[Path]["output"];

export type TRPCMutationResult<Path extends TRPCMutationKey> =
	UseMutationResult<
		TRPCMutationOutput<Path>,
		TRPCError,
		TRPCMutationInput<Path>
	>;
