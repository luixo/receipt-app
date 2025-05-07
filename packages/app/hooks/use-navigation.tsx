import type { UseQueryStateReturn } from "nuqs";
import { entries } from "remeda";
import { useParams, usePathname, useRouter } from "solito/navigation";

import type {
	Filters,
	OrderByLiteral,
} from "~app/features/receipts/receipts-screen";
import type { UsersId } from "~db/models";

type NavigationOptions = {
	replace?: boolean;
};

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: NavigationOptions;
	}
}

type IsParameter<Part> = Part extends `$${infer ParamName}` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
	? IsParameter<PartA> | FilteredParts<PartB>
	: IsParameter<Path>;
type Params<Path> = Record<FilteredParts<Path>, string>;

type IsNonEmptyObject<T> = keyof T extends never ? false : true;

export type UrlParams<P extends string> = {
	to: P;
	hash?: string;
	search?: Record<string, string>;
} & (IsNonEmptyObject<Params<P>> extends true
	? { params: Params<P> }
	: { params?: never });

export const buildUrl = <P extends string>({
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
	return <P extends string>({
		replace,
		to,
		hash,
		params,
	}: NavigationOptions & UrlParams<P>) => {
		router[replace ? "replace" : "push"](
			buildUrl({ to, hash, params } as UrlParams<P>),
		);
	};
};

// Refactor this to add base path or similar
export const useHref = () => (url: string) => url;

type SearchParamsMapping = {
	"/users": {
		limit: number;
		offset: number;
	};
	"/receipts": {
		sort: OrderByLiteral;
		filters: Filters;
		limit: number;
		offset: number;
	};
	"/debts/transfer": {
		from: UsersId;
		to: UsersId;
	};
	"/debts/add": {
		userId: UsersId;
	};
};

export type SearchParamState<
	K extends keyof SearchParamsMapping = keyof SearchParamsMapping,
	P extends keyof SearchParamsMapping[K] = keyof SearchParamsMapping[K],
> = UseQueryStateReturn<SearchParamsMapping[K][P], SearchParamsMapping[K][P]>;

export { useParams, usePathname };
