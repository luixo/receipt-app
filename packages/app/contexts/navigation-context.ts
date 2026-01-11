import * as React from "react";

import type { LinkOptions } from "@tanstack/router-core";
import { doNothing } from "remeda";

import type {
	OutputRouteSearchParams,
	RouteKey,
	SearchParamStateByRoute,
} from "~app/utils/navigation";
import type { TreeRouter } from "~web/entry/router";

export type NavigationContext = {
	useNavigate: () => <K extends RouteKey>(
		options: Omit<LinkOptions<TreeRouter, "/", K>, "from" | "href">,
	) => void;
	usePush: () => (url: string) => void;
	useBack: () => () => void;
	usePathname: () => string;
	useSearchParams: <K extends RouteKey>(key: K) => OutputRouteSearchParams<K>;
	useUpdateSearchParam: <K extends RouteKey>(
		key: K,
	) => <P extends keyof OutputRouteSearchParams<K>>(
		param: P,
	) => SearchParamStateByRoute<K, P>[1];
};
const noop = doNothing();

export const NavigationContext = React.createContext<NavigationContext>({
	useNavigate: () => noop,
	usePush: () => noop,
	useBack: () => noop,
	usePathname: () => "unknown",
	useSearchParams: () => ({}),
	useUpdateSearchParam: () => () => noop,
});
