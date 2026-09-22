import React from "react";

import type { RegisteredRouter, RouteById } from "@tanstack/react-router";
import type {
	LinkOptions as RawLinkOptions,
	NavigateOptions as RawNavigationOptions,
	ValidateNavigateOptions,
} from "@tanstack/router-core";
import { z } from "zod";

import { NavigationContext } from "~app/contexts/navigation-context";
import {
	confirmEmailTokenSchema,
	currencyCodeSchema,
	limitSchema,
	offsetSchema,
	peerIdSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
	resetPasswordTokenSchema,
	voidAccountTokenSchema,
} from "~app/utils/validation";
import type { TreeRouter } from "~web/entry/router";
import type { FileRoutesById, FileRoutesByTo } from "~web/entry/routeTree.gen";

declare module "@react-types/shared" {
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface RouterConfig {
		routerOptions: ValidateNavigateOptions;
	}
}

export type RouteId = keyof FileRoutesById;
export type RouteTo = keyof FileRoutesByTo;
export type PathParams<K extends RouteId> = RouteById<
	RegisteredRouter["routeTree"],
	K
>["types"]["allParams"];
export type OutputRouteSearchParams<K extends RouteId> =
	FileRoutesById[K]["types"]["searchSchema"];
export type InputRouteSearchParams<K extends RouteId> =
	FileRoutesById[K]["types"]["searchSchemaInput"];

export type SearchParamStateByRoute<
	K extends RouteId,
	P extends keyof OutputRouteSearchParams<K>,
> = [
	OutputRouteSearchParams<K>[P],
	(
		setStateAction:
			| InputRouteSearchParams<K>[P]
			| ((
					prevState: OutputRouteSearchParams<K>[P],
			  ) => InputRouteSearchParams<K>[P]),
		options?: RawNavigationOptions<TreeRouter, "/">,
	) => void,
];
export type SearchParamState<
	K extends RouteId,
	P extends keyof OutputRouteSearchParams<K>,
> = SearchParamStateByRoute<K, P>;

export type SearchParamStateDefaulted<
	K extends RouteId,
	P extends keyof OutputRouteSearchParams<K>,
> = [NonNullable<SearchParamState<K, P>[0]>, SearchParamState<K, P>[1]];

export type NavigationOptions<K extends RouteTo> = Omit<
	RawNavigationOptions<TreeRouter, "/", K>,
	"from" | "href"
>;

export type LinkOptions<K extends RouteTo> = Omit<
	RawLinkOptions<TreeRouter, "/", K>,
	"from" | "href"
>;

export const getPathHooks = <K extends RouteId>(key: K) => {
	const useQueryState = <P extends keyof OutputRouteSearchParams<K>>(
		param: P,
	) => {
		const { useSearchParams, useUpdateSearchParam } =
			React.use(NavigationContext);
		const searchParams = useSearchParams(key);
		const getUpdateSearchParam = useUpdateSearchParam(key);
		const setValue = getUpdateSearchParam(param);
		return React.useMemo(
			() => [searchParams[param], setValue] as SearchParamStateByRoute<K, P>,
			[param, searchParams, setValue],
		);
	};
	const useDefaultedQueryState = <
		P extends keyof OutputRouteSearchParams<K>,
		V extends OutputRouteSearchParams<K>[P],
	>(
		param: P,
		defaultValue: V,
	) => {
		const [value, setValue] = useQueryState(param);
		return [value === undefined ? defaultValue : value, setValue] as [
			V,
			SearchParamStateByRoute<K, P>[1],
		];
	};
	const useParams = () => {
		const { useParams: useParamsRaw } = React.use(NavigationContext);
		return useParamsRaw<K>(key);
	};
	return { useQueryState, useDefaultedQueryState, useParams };
};

export const searchParamsMapping = {
	__root__: z.object({
		debug: z.coerce.boolean().default(false).catch(false),
		redirect: z.string().default("").catch(""),
	}),
	"/_public/void-account": z.object({
		token: voidAccountTokenSchema.optional().catch(undefined),
	}),
	"/_public/reset-password": z.object({
		token: resetPasswordTokenSchema.optional().catch(undefined),
	}),
	"/_public/confirm-email": z.object({
		token: confirmEmailTokenSchema.optional().catch(undefined),
	}),
	"/_protected/peers/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.default(0).catch(0),
	}),
	"/_protected/receipts/": z.object({
		sort: receiptsOrderBySchema.default("date-desc").catch("date-desc"),
		filters: receiptsFiltersSchema.default({}).catch({}),
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.default(0).catch(0),
	}),
	"/_protected/debts/transfer": z.object({
		to: peerIdSchema.optional().catch(undefined),
		from: peerIdSchema.optional().catch(undefined),
	}),
	"/_protected/debts/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.default(0).catch(0),
	}),
	"/_protected/debts/peer/$id/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.default(0).catch(0),
	}),
	"/_protected/debts/add": z.object({
		peerId: peerIdSchema.optional().catch(undefined),
	}),
	"/_protected/debts/peer/$id/exchange/all": z.object({
		from: currencyCodeSchema.optional().catch(undefined),
	}),
} satisfies Partial<Record<RouteId, z.ZodType>>;
