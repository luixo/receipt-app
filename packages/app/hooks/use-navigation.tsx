import React from "react";

import {
	useNavigate as useRawNavigate,
	useRouterState,
} from "@tanstack/react-router";
import type {
	AnyRoute,
	LinkOptions,
	NavigateOptions,
	ValidateNavigateOptions,
} from "@tanstack/router-core";

import { updateSetStateAction } from "~utils/react";
import type {
	FileRouteTypes,
	FileRoutesByFullPath,
} from "~web/entry/routeTree.gen";
import type { TreeRouter } from "~web/entry/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: ValidateNavigateOptions;
	}
}

export const useNavigate = () => {
	const navigate = useRawNavigate();
	return <K extends FileRouteTypes["to"]>(
		options: Omit<LinkOptions<TreeRouter, "/", K>, "from" | "href">,
	) => {
		void navigate(options);
	};
};

// Refactor this to add base path or similar
export const useHref = () => (url: string) => url;

type RouteKey = keyof FileRoutesByFullPath;
type RouteByKey<K extends RouteKey> = FileRoutesByFullPath[K];
export type RouteSearchParams<R extends AnyRoute> = R["types"]["searchSchema"];

type SearchParamStateByRoute<
	R extends AnyRoute,
	P extends keyof RouteSearchParams<R>,
> = [
	RouteSearchParams<R>[P],
	(
		setStateAction: React.SetStateAction<RouteSearchParams<R>[P]>,
		options?: NavigateOptions<TreeRouter, "/">,
	) => void,
];
export type SearchParamState<
	R extends RouteKey,
	P extends keyof RouteSearchParams<RouteByKey<R>>,
> = SearchParamStateByRoute<RouteByKey<R>, P>;

export const getQueryStates =
	<R extends AnyRoute>(route: R) =>
	<P extends keyof R["types"]["searchSchema"]>(param: P) => {
		const searchParams = route.useSearch() as R["types"]["searchSchema"];
		const navigate = useRawNavigate();
		const setValue = React.useCallback<SearchParamStateByRoute<R, P>[1]>(
			(setStateAction, options = {}) => {
				void navigate({
					search: (prev) => ({
						...prev,
						[param]: updateSetStateAction(
							setStateAction,
							(prev as R["types"]["searchSchema"])[param],
						),
					}),
					to: ".",
					...options,
				});
			},
			[navigate, param],
		);
		return React.useMemo(
			() => [searchParams[param], setValue] as SearchParamStateByRoute<R, P>,
			[param, searchParams, setValue],
		);
	};

export const usePathname = () => useRouterState().location.pathname;
