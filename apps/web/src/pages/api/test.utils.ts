import type { RouteConstraints } from "@tanstack/react-router";
import type {
	AnyServerRouteWithTypes,
	ServerRouteAfterMethods,
} from "@tanstack/react-start/server";
import { assert } from "vitest";

export const getServerRouteMethod = <
	TParentRoute extends AnyServerRouteWithTypes,
	TId extends RouteConstraints["TId"],
	TPath extends RouteConstraints["TPath"],
	TFullPath extends RouteConstraints["TFullPath"],
	TMiddlewares,
	TMethods,
	TChildren,
>(
	route: ServerRouteAfterMethods<
		TParentRoute,
		TId,
		TPath,
		TFullPath,
		TMiddlewares,
		TMethods,
		TChildren
	>,
	methodName: "GET" | "POST",
) => {
	const method = route.options.methods?.[methodName];
	assert(method);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return method as Exclude<typeof method, { _options: any }>;
};
