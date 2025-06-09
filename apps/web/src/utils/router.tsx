import Head from "next/head";
import { z } from "zod/v4";

import type {
	ExistingPath,
	NavigationStates,
	Params,
} from "~app/hooks/use-navigation";
import { useParams, useSearchParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

/* eslint-disable import-x/no-empty-named-blocks */
// Add all pages with extensions here!
import type {} from "~web/pages/debts/add";
import type {} from "~web/pages/debts/transfer";
import type {} from "~web/pages/receipts";
import type {} from "~web/pages/users";
/* eslint-enable import-x/no-empty-named-blocks */

type MetaElement = {
	title: string;
};

export type SearchMiddleware<S> = (input: S) => S;

type FileRouteProps<
	SearchParams extends Record<string, unknown> = Record<string, unknown>,
> = {
	component: React.ComponentType;
	head?: () => { meta?: MetaElement[] };
	validateSearch?: z.ZodType<SearchParams>;
	search?: {
		middlewares?: SearchMiddleware<SearchParams>[];
	};
};

export type ProtectedOrPublicPath<P extends string> =
	| `/_protected${P}`
	| `/_public${P}`;

export type FileRoute<
	Path extends
		| ProtectedOrPublicPath<ExistingPath>
		| "/" = ProtectedOrPublicPath<ExistingPath>,
	SearchParams extends Record<string, unknown> = Record<string, unknown>,
> = {
	Screen: AppPage;
	searchParams: {
		schema: z.ZodType<SearchParams>;
		middlewares?: SearchMiddleware<SearchParams>[];
	};
	useParams: () => Params<Path>;
	useSearch: () => SearchParams;
};

export const createFileRoute =
	<Path extends ProtectedOrPublicPath<ExistingPath> | "/">(path: Path) =>
	<SearchParams extends Record<string, unknown>>({
		component: Component,
		head: headFn,
		validateSearch,
		search,
	}: FileRouteProps<SearchParams>): FileRoute<Path, SearchParams> => {
		const Wrapper: AppPage = () => {
			const head = headFn?.();
			return (
				<>
					<Component />
					{head ? (
						<Head>
							{head.meta?.map((headElement, index) => {
								if ("title" in headElement) {
									// eslint-disable-next-line react/no-array-index-key
									return <title key={index}>{headElement.title}</title>;
								}
								return null;
							})}
						</Head>
					) : null}
				</>
			);
		};
		if (path.startsWith("/_public")) {
			Wrapper.public = true;
		}
		return {
			Screen: Wrapper,
			useParams: () => useParams<Params<Path>>(),
			useSearch: () =>
				(
					useSearchParams(
						validateSearch || z.any(),
						search?.middlewares,
					) as NavigationStates<SearchParams>
				)[0],
			searchParams: {
				schema: validateSearch ?? z.any(),
				middlewares: search?.middlewares,
			},
		};
	};
