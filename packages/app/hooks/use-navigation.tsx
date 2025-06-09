import type { SetStateAction } from "react";
import React from "react";

import type { RegisteredParams } from "@react-types/shared";
import { entries, keys, mapValues, omit, omitBy } from "remeda";
import {
	useParams,
	usePathname,
	useSearchParams as useRawSearchParams,
	useRouter,
} from "solito/navigation";
import z from "zod/v4";

import { updateSetStateAction } from "~utils/react";
import type {
	FileRoute,
	ProtectedOrPublicPath,
	SearchMiddleware,
} from "~web/utils/router";

type NavigationOptions = {
	replace?: boolean;
};

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: NavigationOptions & UrlParams<ExistingPath>;
	}
}

type IsParameter<Part> = Part extends `$${infer ParamName}` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
	? IsParameter<PartA> | FilteredParts<PartB>
	: IsParameter<Path>;
export type Params<Path> = Record<FilteredParts<Path>, string>;

type IsNonEmptyObject<T> = keyof T extends never ? false : true;

export type ExistingPath =
	| "/"
	| "/account"
	| "/admin"
	| "/settings"
	| "/confirm-email"
	| "/login"
	| "/register"
	| "/reset-password"
	| "/void-account"
	| "/debts/$id"
	| "/debts/add"
	| "/debts/intentions"
	| "/debts/transfer"
	| "/receipts/$id"
	| "/receipts/add"
	| "/users/$id"
	| "/users/add"
	| "/users/connections"
	| "/debts"
	| "/receipts"
	| "/users"
	| "/debts/user/$id"
	| "/debts/user/$id/exchange"
	| "/debts/user/$id/exchange/all"
	| "/debts/user/$id/exchange/specific";

export type UrlParams<P extends ExistingPath> = {
	to: P;
	hash?: string;
	search?: Record<string, string>;
} & (IsNonEmptyObject<Params<P>> extends true
	? { params: Params<P> }
	: { params?: never });

export const buildUrl = <P extends ExistingPath>({
	to,
	hash,
	search,
	params,
}: UrlParams<P>) =>
	entries((params || {}) as Record<string, string>).reduce<string>(
		(acc, [key, value]) => acc.replace(`$${key}`, value),
		to,
	) +
	(search
		? `?${entries(search)
				.map(([key, value]) => `${key}=${value}`)
				.join("&")}`
		: "") +
	(hash ? `#${hash}` : "");

export const useNavigate = () => {
	const router = useRouter();
	return React.useCallback(
		<P extends ExistingPath>({
			replace,
			to,
			hash,
			params,
			search,
		}: NavigationOptions & UrlParams<P>) => {
			router[replace ? "replace" : "push"](
				buildUrl({ to, hash, params, search } as UrlParams<P>),
			);
		},
		[router],
	);
};

// Refactor this to add base path or similar
export const useHref = () => (url: string) => url;

export type NavigationStates<V> = [
	V,
	(
		setStateAction: React.SetStateAction<V>,
		options?: NavigationOptions,
	) => void,
];

export type SearchParamState<
	K extends keyof RegisteredParams = keyof RegisteredParams,
	P extends keyof RegisteredParams[K] = keyof RegisteredParams[K],
> = NavigationStates<RegisteredParams[K][P]>;

const searchParamsToData = <SearchParams extends Record<string, unknown>>(
	schema: z.ZodType<SearchParams>,
	input: URLSearchParams,
): [SearchParams, Record<string, string>] => {
	// eslint-disable-next-line no-restricted-syntax
	const params = Object.fromEntries(input);
	const { data = {} } = schema.safeParse(
		mapValues(params, (value) => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return JSON.parse(value);
			} catch {
				return value;
			}
		}),
	);
	return [
		data as SearchParams,
		omit(params, schema instanceof z.ZodObject ? keys(schema.shape) : []),
	];
};

const dataToSearchParams = <SearchParams extends Record<string, unknown>>(
	input: SearchParams,
	middlewares: SearchMiddleware<SearchParams>[] | undefined,
	otherUrlSearchParams: Record<string, string>,
): URLSearchParams => {
	const filteredInput = (middlewares ?? []).reduce(
		(acc, middleware) => middleware(acc),
		input,
	);
	return new URLSearchParams({
		...otherUrlSearchParams,
		...omitBy(
			mapValues(filteredInput, (value) =>
				typeof value === "string" ? value : JSON.stringify(value),
			),
			(value) => !value,
		),
	});
};

export const useSearchParams = <SearchParams extends Record<string, unknown>>(
	schema: z.ZodType<SearchParams>,
	middlewares?: SearchMiddleware<SearchParams>[],
): NavigationStates<SearchParams> => {
	const searchParams = useRawSearchParams();
	const [value] = searchParamsToData(schema, searchParams as URLSearchParams);
	const router = useRouter();
	const setValue = React.useCallback<NavigationStates<SearchParams>[1]>(
		(setStateAction, options = {}) => {
			const prevUrl = new URL(window.location.href);
			const [currentData, restSearchParams] = searchParamsToData(
				schema,
				prevUrl.searchParams,
			);
			const nextValue = updateSetStateAction(setStateAction, currentData);
			prevUrl.search = dataToSearchParams(
				nextValue,
				middlewares,
				restSearchParams,
			).toString();
			router[options.replace ? "replace" : "push"](prevUrl.toString());
		},
		[middlewares, router, schema],
	);
	return [value, setValue];
};

export const getParamsQueryStates =
	<SearchParams extends Record<string, unknown>>(
		searchParams: FileRoute<"/", SearchParams>["searchParams"],
	) =>
	<SearchKey extends keyof SearchParams & string>(param: SearchKey) => {
		const [data, setData] = useSearchParams(
			searchParams.schema,
			searchParams.middlewares,
		);
		const setValue = React.useCallback<
			(
				setStateAction: SetStateAction<SearchParams[SearchKey]>,
				options?: NavigationOptions,
			) => void
		>(
			(setStateAction, options = {}) => {
				setData((prevSearchParams) => {
					const nextValue = updateSetStateAction(
						setStateAction,
						prevSearchParams[param],
					);
					return { ...prevSearchParams, [param]: nextValue };
				}, options);
			},
			[param, setData],
		);
		return [data[param], setValue] as NavigationStates<SearchParams[SearchKey]>;
	};

export const getQueryStates = <
	Path extends ProtectedOrPublicPath<ExistingPath>,
	SearchParams extends Record<string, unknown>,
>(
	route: FileRoute<Path, SearchParams>,
) => getParamsQueryStates<SearchParams>(route.searchParams);

export { useParams, usePathname };
