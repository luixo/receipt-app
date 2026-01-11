import React from "react";

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
import type { FileRoutesByFullPath } from "~web/entry/routeTree.gen";
import type { TreeRouter } from "~web/entry/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: ValidateNavigateOptions;
	}
}

export type RouteKey = keyof FileRoutesByFullPath;
type RouteByKey<K extends RouteKey> = FileRoutesByFullPath[K];
export type OutputRouteSearchParams<K extends RouteKey> =
	RouteByKey<K>["types"]["searchSchema"];
export type InputRouteSearchParams<K extends RouteKey> =
	RouteByKey<K>["types"]["searchSchemaInput"];

export type SearchParamStateByRoute<
	K extends RouteKey,
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
	K extends RouteKey,
	P extends keyof OutputRouteSearchParams<K>,
> = SearchParamStateByRoute<K, P>;

export type SearchParamStateDefaulted<
	K extends RouteKey,
	P extends keyof OutputRouteSearchParams<K>,
	O extends OutputRouteSearchParams<K>[P],
> = [O, SearchParamState<K, P>[1]];

export const getQueryStates = <K extends RouteKey>(rawKey: K) => {
	// Tanstack Start for some reason provides a key with a trailing slash
	const key = rawKey.replace(/\/$/, "") as K;
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
	return { useQueryState, useDefaultedQueryState };
};

export const searchParamsMapping = {
	__root__: z.object({
		debug: z.coerce.boolean().optional().catch(false),
		redirect: z.string().optional().catch(""),
	}),
	"/void-account": z.object({
		token: voidAccountTokenSchema.optional().catch(undefined),
	}),
	"/reset-password": z.object({
		token: resetPasswordTokenSchema.optional().catch(undefined),
	}),
	"/confirm-email": z.object({
		token: confirmEmailTokenSchema.optional().catch(undefined),
	}),
	"/users": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/receipts": z.object({
		sort: receiptsOrderBySchema.catch("date-desc"),
		filters: receiptsFiltersSchema.catch({}),
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/debts/transfer": z.object({
		to: userIdSchema.optional().catch(undefined),
		from: userIdSchema.optional().catch(undefined),
	}),
	"/debts": z.object({
		limit: limitSchema.optional().catch(undefined),
		offset: offsetSchema.catch(0),
	}),
	"/debts/add": z.object({
		userId: userIdSchema.optional().catch(undefined),
	}),
	"/debts/user/$id/exchange/all": z.object({
		from: currencyCodeSchema.optional().catch(undefined),
	}),
} satisfies Partial<Record<RouteKey | "__root__", z.ZodType>>;
