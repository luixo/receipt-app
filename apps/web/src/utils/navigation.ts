import { mapValues } from "remeda";
import { z } from "zod";

import type { NoUndefined } from "~utils/types";

export const searchParamsWithDefaults = <S extends Record<string, z.ZodType>>(
	schema: z.ZodObject<S>,
	defaultValues: { [K in keyof S]: z.infer<S[K]> },
) =>
	[
		z.object(
			mapValues(
				schema.shape,
				(value, key) =>
					(value as S[keyof S])
						.optional()
						.default(defaultValues[key])
						// Catch is hard to type so we ignore it for now
						.catch(
							defaultValues[key] as NoUndefined<z.infer<S[keyof S]>>,
						) as unknown as z.ZodDefault<z.ZodOptional<S[keyof S]>>,
			) as { [K in keyof S]: z.ZodDefault<z.ZodOptional<S[K]>> },
		),
		defaultValues,
	] as const;
