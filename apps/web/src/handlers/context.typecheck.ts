import type { inferProcedureInput } from "@trpc/server";
import { z } from "zod";

import type { ValidateHandlerVersions } from "~web/handlers/context";
import { defineHandlerVersions } from "~web/handlers/context";
import type { procedure as pingProcedure } from "~web/handlers/utils/ping";

type Assert<Condition extends true> = Condition;
type IsNever<Value> = [Value] extends [never] ? true : false;
type IsEqual<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? true
		: false;

const latestSchema = z.object({ value: z.number() });
const oldSchema = z.object({ value: z.string() }).transform(({ value }) => ({
	value: Number(value),
}));
const incompatibleSchema = z.object({ value: z.string() });

const validVersions = [
	[1, oldSchema],
	[2, latestSchema],
] as const;
const invalidLinkVersions = [
	[1, latestSchema],
	[2, oldSchema],
] as const;
const invalidLastVersions = [[1, incompatibleSchema]] as const;

export type ValidChainIsPreserved = Assert<
	IsEqual<
		ValidateHandlerVersions<typeof latestSchema, typeof validVersions>,
		typeof validVersions
	>
>;
export type InvalidLinkIsRejected = Assert<
	IsNever<
		ValidateHandlerVersions<typeof latestSchema, typeof invalidLinkVersions>
	>
>;
export type InvalidLastOutputIsRejected = Assert<
	IsNever<
		ValidateHandlerVersions<typeof latestSchema, typeof invalidLastVersions>
	>
>;
export type PingInputIsValidated = Assert<
	IsEqual<
		inferProcedureInput<typeof pingProcedure>,
		{ timeout: number; error?: boolean }
	>
>;

defineHandlerVersions(latestSchema)(validVersions);
