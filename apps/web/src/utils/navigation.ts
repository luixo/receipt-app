import React from "react";

import {
	stripSearchParams,
	useParams,
	useNavigate as useRawNavigate,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import type { ValidateNavigateOptions } from "@tanstack/router-core";
import { mapValues } from "remeda";
import type { z } from "zod";

import type { NavigationContext } from "~app/contexts/navigation-context";
import type { OutputRouteSearchParams, RouteId } from "~app/utils/navigation";
import { searchParamsMapping } from "~app/utils/navigation";
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
	useParams: (key) => useParams({ from: key }),
	usePathname: () => useRouterState().location.pathname,
	useSearchParams: <K extends RouteId>(key: K) => {
		const router = useRouter();
		const keyWithSlash = key.endsWith("/") ? key : (`${key}/` as K);
		const keyWithoutSlash = key.endsWith("/") ? (key.slice(0, -1) as K) : key;
		const route =
			// There's inconsistency with generated types in Tanstack Router, this is an attempt to fix that
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			router.routesById[keyWithSlash] || router.routesById[keyWithoutSlash];
		return route.useSearch();
	},
	useUpdateSearchParam: <K extends RouteId>() => {
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

export const searchParamsWithDefaults = <
	K extends keyof typeof searchParamsMapping,
>(
	key: K,
) => {
	const shape = searchParamsMapping[key];
	type ResultSchema = z.ZodObject<
		typeof shape extends z.ZodObject<
			infer Shape extends Record<string, z.ZodCatch>
		>
			? { [S in keyof Shape]: z.ZodDefault<Shape[S]> }
			: never
	>;
	const defaultValues = mapValues(shape.shape, (value) =>
		// `catchValue` doesn't actually do anything with it's argument
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value.def.catchValue({} as any),
	) as z.input<ResultSchema>;
	return {
		validateSearch: shape as unknown as ResultSchema,
		search: {
			middlewares: [stripSearchParams<z.input<ResultSchema>>(defaultValues)],
		},
	};
};
