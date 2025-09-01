import React from "react";

import {
	useNavigate as useRawNavigate,
	useRouter,
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

export const useHistoryPush = () => {
	const router = useRouter();
	return (url: string) => router.history.push(url);
};

// Refactor this to add base path or similar
export const useHref = () => (url: string) => url;

type RouteKey = keyof FileRoutesByFullPath;
type RouteByKey<K extends RouteKey> = FileRoutesByFullPath[K];
export type OutputRouteSearchParams<R extends AnyRoute> =
	R["types"]["searchSchema"];
export type InputRouteSearchParams<R extends AnyRoute> =
	R["types"]["searchSchemaInput"];

type SearchParamStateByRoute<
	R extends AnyRoute,
	P extends keyof OutputRouteSearchParams<R>,
> = [
	OutputRouteSearchParams<R>[P],
	(
		setStateAction:
			| InputRouteSearchParams<R>[P]
			| ((
					prevState: OutputRouteSearchParams<R>[P],
			  ) => InputRouteSearchParams<R>[P]),
		options?: NavigateOptions<TreeRouter, "/">,
	) => void,
];
export type SearchParamState<
	R extends RouteKey,
	P extends keyof OutputRouteSearchParams<RouteByKey<R>>,
> = SearchParamStateByRoute<RouteByKey<R>, P>;

export type SearchParamStateDefaulted<
	R extends RouteKey,
	P extends keyof OutputRouteSearchParams<RouteByKey<R>>,
	O extends OutputRouteSearchParams<RouteByKey<R>>[P],
> = [O, SearchParamState<R, P>[1]];

export const getQueryStates = <R extends AnyRoute>(route: R) => {
	const useQueryState = <P extends keyof R["types"]["searchSchema"]>(
		param: P,
	) => {
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
	const useDefaultedQueryState = <
		P extends keyof R["types"]["searchSchema"],
		K extends R["types"]["searchSchema"][P],
	>(
		param: P,
		defaultValue: K,
	) => {
		const [value, setValue] = useQueryState(param);
		return [value === undefined ? defaultValue : value, setValue] as [
			K,
			SearchParamStateByRoute<R, P>[1],
		];
	};
	return { useQueryState, useDefaultedQueryState };
};

export const usePathname = () => useRouterState().location.pathname;
