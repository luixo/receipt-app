import React from "react";

import {
	stripSearchParams,
	useNavigate as useRawNavigate,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import type { ValidateNavigateOptions } from "@tanstack/router-core";
import { mapValues } from "remeda";
import type { z } from "zod";

import type { NavigationContext } from "~app/contexts/navigation-context";
import type { OutputRouteSearchParams, RouteKey } from "~app/utils/navigation";
import { updateSetStateAction } from "~utils/react";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: ValidateNavigateOptions;
	}
}

export const navigationContext: NavigationContext = {
	useNavigate: () => {
		const navigate = useRawNavigate();
		return (options) => {
			void navigate(options);
		};
	},
	usePush: () => {
		const router = useRouter();
		return (url) => router.history.push(url);
	},
	useBack: () => {
		const router = useRouter();
		return () => router.history.back();
	},
	usePathname: () => useRouterState().location.pathname,
	useSearchParams: <K extends RouteKey>(key: K) => {
		const router = useRouter();
		return router.routesByPath[key].useSearch();
	},
	useUpdateSearchParam: <K extends RouteKey>() => {
		const navigate = useRawNavigate();
		return React.useCallback(
			(param) =>
				(setStateAction, options = {}) => {
					void navigate({
						search: (prev) => ({
							...prev,
							[param]: updateSetStateAction(
								setStateAction,
								(prev as OutputRouteSearchParams<K>)[param],
							),
						}),
						to: ".",
						...options,
					});
				},
			[navigate],
		);
	},
};

export const searchParamsWithDefaults = <S extends Record<string, z.ZodCatch>>(
	shape: z.ZodObject<S>,
) => {
	const defaultValues = mapValues(shape.shape, (value) =>
		// `catchValue` doesn't actually do anything with it's argument
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value.def.catchValue({} as any),
	) as z.input<ResultSchema>;
	type ResultSchema = z.ZodObject<{ [K in keyof S]: z.ZodDefault<S[K]> }>;
	return [
		shape as unknown as ResultSchema,
		stripSearchParams<z.input<ResultSchema>>(defaultValues),
	] as const;
};
