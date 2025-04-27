import type React from "react";

import { useQueryState, useQueryStates } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { useParams, usePathname, useRouter } from "solito/navigation";

import type { SearchParams } from "~app/utils/navigation";

type NavigationOptions = {
	replace?: boolean;
};

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RouterConfig {
		routerOptions: NavigationOptions;
	}
}

export const useNavigate = () => {
	const router = useRouter();
	return (url: string, { replace }: NavigationOptions = {}) => {
		router[replace ? "replace" : "push"](url);
	};
};

// Refactor this to add base path or similar
export const useHref = () => (url: string) => url;

export const useMatchRoute = () => {
	const pathname = usePathname() ?? "";
	return (routeToMatch: string | RegExp) =>
		typeof routeToMatch === "string"
			? pathname === routeToMatch
			: routeToMatch.test(pathname);
};

export const SearchParamsProvider: React.FC<
	React.PropsWithChildren<{ searchParams: SearchParams }>
> = ({ children }) => <NuqsAdapter>{children}</NuqsAdapter>;

export { useParams, useQueryState, useQueryStates };
