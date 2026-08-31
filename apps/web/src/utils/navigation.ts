import React from "react";

import type { SearchMiddleware } from "@tanstack/react-router";
import {
	stripSearchParams,
	useParams,
	useNavigate as useRawNavigate,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import type { ValidateNavigateOptions } from "@tanstack/router-core";
import { mapValues, omitBy } from "remeda";
import { z } from "zod";

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
		return router.routesById[key].useSearch();
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
	const schema = searchParamsMapping[key];
	const defaultValues = mapValues(
		omitBy(schema.shape, (value) => !(value instanceof z.ZodCatch)),
		(value) =>
			value instanceof z.ZodCatch
				? value.def.catchValue({
						/* eslint-disable typescript/no-deprecated */
						error: { issues: [] },
						input: undefined,
						/* eslint-enable typescript/no-deprecated */
						value: undefined,
						issues: [],
					})
				: undefined,
	);
	return {
		validateSearch: schema,
		search: {
			middlewares: [
				// Apparently, the type inference is different in linter and typescript compiler
				// Any is needed because we don't use search middleware functions
				// oxlint-disable-next-line typescript/no-unnecessary-type-assertion typescript/no-explicit-any
				stripSearchParams(defaultValues) as SearchMiddleware<any>,
			],
		},
	};
};
