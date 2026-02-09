import React from "react";

import type { RegisteredRouter, RouteById } from "@tanstack/react-router";
import type {
	NavigateOptions,
	ValidateNavigateOptions,
} from "@tanstack/router-core";
import { z } from "zod";

import { NavigationContext } from "~app/contexts/navigation-context";
import {
	confirmEmailTokenSchema,
	currencyCodeSchema,
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
	resetPasswordTokenSchema,
	userIdSchema,
	voidAccountTokenSchema,
} from "~app/utils/validation";
import type {
	FileRoutesByFullPath,
	FileRoutesById,
} from "~web/entry/routeTree.gen";
import type { TreeRouter } from "~web/entry/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: ValidateNavigateOptions;
	}
}

export type RouteId = keyof FileRoutesById;
export type RoutePath = keyof FileRoutesByFullPath;
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
		options?: NavigateOptions<TreeRouter, "/">,
	) => void,
];
export type SearchParamState<
	K extends RouteId,
	P extends keyof OutputRouteSearchParams<K>,
> = SearchParamStateByRoute<K, P>;

export type SearchParamStateDefaulted<
	K extends RouteId,
	P extends keyof OutputRouteSearchParams<K>,
	O extends OutputRouteSearchParams<K>[P],
> = [O, SearchParamState<K, P>[1]];

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
		debug: z.coerce.boolean().optional().catch(false),
		redirect: z.string().optional().catch(""),
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
	"/_protected/users/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/_protected/receipts/": z.object({
		sort: receiptsOrderBySchema.catch("date-desc"),
		filters: receiptsFiltersSchema.catch({}),
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/_protected/debts/transfer": z.object({
		to: userIdSchema.optional().catch(undefined),
		from: userIdSchema.optional().catch(undefined),
	}),
	"/_protected/debts/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/_protected/debts/user/$id/": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/_protected/debts/add": z.object({
		userId: userIdSchema.optional().catch(undefined),
	}),
	"/_protected/debts/user/$id/exchange/all": z.object({
		from: currencyCodeSchema.optional().catch(undefined),
	}),
} satisfies Partial<Record<RouteId, z.ZodType>>;
