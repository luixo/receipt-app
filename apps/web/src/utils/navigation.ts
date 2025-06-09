import { mapValues, omitBy } from "remeda";
import { z } from "zod/v4";

import type { SearchMiddleware } from "~web/utils/router";

export type SearchParams = Partial<Record<string, string | string[]>>;

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

export const stripSearchParams =
	<S extends Record<string, unknown>>(
		defaultValues: S,
	): SearchMiddleware<typeof defaultValues> =>
	(prevValues) =>
		// @ts-expect-error Expected to be replaced soon
		omitBy(
			mapValues(prevValues, (value, key) =>
				JSON.stringify(value) === JSON.stringify(defaultValues[key])
					? undefined
					: value,
			),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			(v) => v === undefined,
		);
