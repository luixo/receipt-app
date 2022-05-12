import { createReactQueryHooks, TRPCClientErrorLike } from "@trpc/react";
import { UseQueryResult } from "react-query";
import { Procedure } from "@trpc/server/dist/declarations/src/internals/procedure";
import {
	Router,
	ProcedureRecord,
} from "@trpc/server/dist/declarations/src/router";
import type { AppRouter } from "../../apps/next/pages/api/trpc/[trpc]";

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

type QueryValues<Router extends AnyRouter> = InferProcedures<
	Router["_def"]["queries"]
>;

type QueryKey<Router extends AnyRouter> = keyof Router["_def"]["queries"];

// anything router-specific goes below

export const trpc = createReactQueryHooks<AppRouter>();

export type TRPCQueryOutput<Path extends QueryKey<AppRouter>> =
	QueryValues<AppRouter>[Path]["output"];

export type TRPCQueryInput<Path extends QueryKey<AppRouter>> =
	QueryValues<AppRouter>[Path]["input"];

export type TRPCError = TRPCClientErrorLike<AppRouter>;

export type TRPCQueryResult<Path extends QueryKey<AppRouter>> = UseQueryResult<
	TRPCQueryOutput<Path>,
	TRPCError
>;
