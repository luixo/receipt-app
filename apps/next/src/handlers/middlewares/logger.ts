import { MiddlewareFunction } from "@trpc/server/dist/declarations/src/internals/middlewares";
import { Context } from "../context";

export const middleware: MiddlewareFunction<
	Context,
	Context,
	unknown
> = async ({ path, type, next }) => {
	const start = Date.now();
	const result = await next();
	const duration = Date.now() - start;
	const options = {
		path,
		type,
		durationMs: duration,
	};
	result.ok
		? result.ctx.logger.trace(options, "OK request timing:")
		: result.ctx.logger.trace(options, "Non-OK request timing");

	return result;
};
