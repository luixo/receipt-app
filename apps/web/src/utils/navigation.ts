import { mapValues } from "remeda";
import { z } from "zod";

export const searchParamsWithDefaults = <S extends Record<string, z.ZodType>>(
	schema: z.ZodObject<S>,
	defaultValues: { [K in keyof S]: z.infer<S[K]> },
) =>
	[
		z.object(
			mapValues(schema.shape, (value, key) =>
				(value as S[keyof S]).optional().default(defaultValues[key]),
			) as { [K in keyof S]: z.ZodDefault<z.ZodOptional<S[K]>> },
		),
		defaultValues,
	] as const;
