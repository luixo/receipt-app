import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, Path, Resolver, useForm } from "react-hook-form";
import { z } from "zod";

import { useInputController } from "app/hooks/use-input-controller";

type Form<T> = {
	value: T;
};

export type SingleInputOptions<T> = {
	initialValue?: T;
	schema?: z.ZodType<T>;
};

export const useSingleInput = <T>({
	initialValue,
	schema,
}: SingleInputOptions<T>) => {
	const form = useForm<Form<T>>({
		mode: "onChange",
		defaultValues: {
			value: initialValue,
		} as DefaultValues<Form<T>>,
		resolver: React.useMemo(
			() =>
				schema
					? (zodResolver(z.object({ value: schema })) as Resolver<Form<T>>)
					: undefined,
			[schema]
		),
	});
	return useInputController({
		form,
		name: "value" as Path<Form<T>>,
	});
};
