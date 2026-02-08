import React from "react";

import {
	defaultParseSearch,
	defaultStringifySearch,
} from "@tanstack/react-router";
import { openURL } from "expo-linking";
import {
	useLocalSearchParams,
	usePathname,
	useRouter,
	useSegments,
} from "expo-router";
import { fromEntries, mapValues } from "remeda";

import type { NavigationContext } from "~app/contexts/navigation-context";
import type { OutputRouteSearchParams, RouteId } from "~app/utils/navigation";
import { searchParamsMapping } from "~app/utils/navigation";
import { updateSetStateAction } from "~utils/react";

type SearchParams = Record<string, string | string[]>;

const nativeToWeb = (pathname: string) =>
	pathname.replaceAll(/\[([^\]/]+)\]/g, "$$$1");
const webToNative = (pathname: string) =>
	pathname.replaceAll(/\$([A-Za-z_$][\w$]*)/g, "[$1]");

const deserializeSearchParams = (
	key: RouteId,
	searchParams: Partial<SearchParams>,
) => {
	const mappedSearchParams = defaultParseSearch(
		new URLSearchParams(
			mapValues(
				searchParams,
				(value) => (Array.isArray(value) ? value[0] : value) || "",
			),
		).toString(),
	);
	const schema =
		key in searchParamsMapping
			? searchParamsMapping[key as keyof typeof searchParamsMapping]
			: undefined;
	if (!schema) {
		return mappedSearchParams;
	}
	const parsedSearchParams = schema.safeParse(mappedSearchParams);
	if (parsedSearchParams.success) {
		return parsedSearchParams.data;
	}
	return {};
};

const serializeSearchParams = (params: Record<string, unknown>) =>
	defaultStringifySearch(params);

export const navigationContext: NavigationContext = {
	useNavigate: () => {
		const router = useRouter();
		return (options) => {
			const searchParams =
				options.search === true || typeof options.search === "function"
					? undefined
					: (options.search as object);
			const pathParams =
				options.params === true || typeof options.params === "function"
					? undefined
					: (options.params as object);
			const hashParams = options.hash
				? { "#": options.hash as string }
				: undefined;
			const method = options.replace ? router.replace : router.push;
			void method({
				pathname: webToNative(options.to || "/"),
				params: { ...searchParams, ...pathParams, ...hashParams },
			});
		};
	},
	usePush: () => (url) => {
		void openURL(url);
	},
	useBack: () => {
		const router = useRouter();
		return () => router.back();
	},
	usePathname: () => {
		const pathname = usePathname();
		return nativeToWeb(pathname);
	},
	useParams: () => {
		const params = useLocalSearchParams();
		const segments = useSegments();
		const segmentKeys = segments
			.filter((segment) => segment.startsWith("[") && segment.endsWith("]"))
			.map((segment) => segment.slice(1, -1));
		return fromEntries(segmentKeys.map((key) => [key, params[key]]));
	},
	useSearchParams: (key) => {
		const searchParams = useLocalSearchParams();
		return deserializeSearchParams(key, searchParams);
	},
	useUpdateSearchParam: (key) => {
		const router = useRouter();
		const searchParams = useLocalSearchParams();
		return React.useCallback(
			(param) => (setStateAction) => {
				const prevParams = deserializeSearchParams(key, searchParams);
				const nextParam = updateSetStateAction(
					setStateAction,
					(prevParams as OutputRouteSearchParams<typeof key>)[param],
				);
				const nextParams = {
					...prevParams,
					[param]: nextParam,
				};
				const serializedNextParams = serializeSearchParams(nextParams);
				const url = new URL(`/${serializedNextParams}`, "http://localhost");
				router.setParams(fromEntries(Array.from(url.searchParams.entries())));
			},
			[router, key, searchParams],
		);
	},
};
