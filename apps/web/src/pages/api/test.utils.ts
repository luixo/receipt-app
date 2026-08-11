import type {
	Expand,
	ResolveAllParamsFromParent,
	RouteConstraints,
} from "@tanstack/react-router";
import type { RouteMethod } from "@tanstack/react-start";
import type { Route } from "@tanstack/router-core";
import { assert } from "vitest";

export const getServerRouteMethod = <
	TRegister,
	TParentRoute extends RouteConstraints["TParentRoute"],
	TPath extends RouteConstraints["TPath"],
	TFullPath extends RouteConstraints["TFullPath"],
	TCustomId extends RouteConstraints["TCustomId"],
	TId extends RouteConstraints["TId"],
	TSearchValidator,
	TParams,
	TRouterContext,
	TRouteContextFn,
	TBeforeLoadFn,
	TLoaderDeps extends Record<string, unknown>,
	TLoaderFn,
	TChildren,
	TFileRouteTypes,
	TSSR,
	TServerMiddlewares,
	THandlers,
>(
	route: Route<
		TRegister,
		TParentRoute,
		TPath,
		TFullPath,
		TCustomId,
		TId,
		TSearchValidator,
		TParams,
		TRouterContext,
		TRouteContextFn,
		TBeforeLoadFn,
		TLoaderDeps,
		TLoaderFn,
		TChildren,
		TFileRouteTypes,
		TSSR,
		TServerMiddlewares,
		THandlers
	>,
	methodName: RouteMethod,
) => {
	const methods = route.options.server?.handlers;
	if (typeof methods === "function") {
		throw new TypeError("Expected to have static methods!");
	}
	const method = methods?.[methodName];
	assert(method);
	return async (props: {
		pathname: TPath;
		request: Request;
		params: Expand<ResolveAllParamsFromParent<TParentRoute, TParams>>;
	}) => {
		const response = await method({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			context: undefined as any,
			next: () => {
				throw new Error("Next function should not be run in tests!");
			},
			...props,
		});
		if (!response) {
			throw new Error("Expected to have response in tests!");
		}
		if ("isNext" in response) {
			throw new Error("Didn't expect to have isNext in tests!");
		}
		return response;
	};
};
