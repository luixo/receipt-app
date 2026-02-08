import * as React from "react";

import type { LinkOptions } from "@tanstack/router-core";
import { doNothing } from "remeda";

import type {
	OutputRouteSearchParams,
	PathParams,
	RouteId,
	RoutePath,
	SearchParamStateByRoute,
} from "~app/utils/navigation";
import type { TreeRouter } from "~web/entry/router";

export type NavigationContext = {
	useNavigate: () => <K extends RoutePath>(
		options: Omit<LinkOptions<TreeRouter, "/", K>, "from" | "href">,
	) => void;
	useParams: <K extends RouteId>(routeKey: K) => PathParams<K>;
	usePush: () => (url: string) => void;
	useBack: () => () => void;
	usePathname: () => string;
	useSearchParams: <K extends RouteId>(key: K) => OutputRouteSearchParams<K>;
	useUpdateSearchParam: <K extends RouteId>(
		key: K,
	) => <P extends keyof OutputRouteSearchParams<K>>(
		param: P,
	) => SearchParamStateByRoute<K, P>[1];
};
const noop = doNothing();

export const NavigationContext = React.createContext<NavigationContext>({
	useNavigate: () => noop,
	useParams: () => ({}),
	usePush: () => noop,
	useBack: () => noop,
	usePathname: () => "unknown",
	useSearchParams: () => ({}),
	useUpdateSearchParam: () => () => noop,
});
