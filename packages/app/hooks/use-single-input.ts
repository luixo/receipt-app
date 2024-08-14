import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { DefaultValues, Path, Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useInputController } from "~app/hooks/use-input-controller";
import { formatIsoDate } from "~utils/date";

type Form<T> = {
	value: T;
};

export type SingleInputOptions<T> = {
	initialValue?: T;
	schema?: z.ZodType<T>;
	type?: React.HTMLInputTypeAttribute;
};

export const useSingleInput = <T>({
	initialValue,
	schema,
	type,
}: SingleInputOptions<T>) => {
	const form = useForm<Form<T>>({
		mode: "onChange",
		defaultValues: {
			value:
				type === "date"
					? formatIsoDate(initialValue as unknown as Date)
					: initialValue,
		} as DefaultValues<Form<T>>,
		resolver: React.useMemo(
			() =>
				schema
					? (zodResolver(
							z.object({
								value:
									type === "number"
										? z.preprocess(Number, schema)
										: type === "date"
										? z.preprocess((input) => new Date(input as string), schema)
										: schema,
							}),
					  ) as Resolver<Form<T>>)
					: undefined,
			[schema, type],
		),
	});
	return useInputController({
		form,
		name: "value" as Path<Form<T>>,
		type,
	});
};
