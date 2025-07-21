import { stripSearchParams } from "@tanstack/react-router";
import { mapValues } from "remeda";
import { z } from "zod";

export const searchParamsWithDefaults = <S extends Record<string, z.ZodCatch>>(
	shape: S,
) => {
	const defaultValues = mapValues(shape, (value) =>
		// `catchValue` doesn't actually do anything with it's argument
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value.def.catchValue({} as any),
	) as z.input<ResultSchema>;
	type ResultSchema = z.ZodObject<{ [K in keyof S]: z.ZodDefault<S[K]> }>;
	return [
		z.object(shape) as unknown as ResultSchema,
		stripSearchParams<z.input<ResultSchema>>(defaultValues),
	] as const;
};
