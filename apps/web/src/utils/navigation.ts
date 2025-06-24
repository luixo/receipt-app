import { mapValues } from "remeda";
import { z } from "zod/v4";

type WithDefaultCatch<S extends z.ZodRawShape> = {
	[K in keyof S]: z.ZodDefault<
		z.ZodPipe<
			z.ZodType<S[K]["_zod"]["output"], S[K]["_zod"]["input"]>,
			z.ZodCatch<S[K]>
		>
	>;
};

export const searchParamsWithDefaults = <S extends Record<string, z.ZodType>>(
	schema: z.ZodObject<S>,
	defaultValues: { [K in keyof S]: z.infer<S[K]> },
) =>
	[
		z.object(
			mapValues(schema.shape, (value, key) =>
				z.custom().pipe((value as S[keyof S]).catch(defaultValues[key])),
			) as WithDefaultCatch<S>,
		),
		defaultValues,
	] as const;
