import type {
	ProcedureResolverOptions,
	UnsetMarker,
} from "@trpc/server/unstable-core-do-not-import";
import type { Options } from "dataloader";
import Dataloader from "dataloader";

import { noop } from "~utils/fn";
import type { MaybePromise } from "~utils/types";
import type {
	AuthorizedContext,
	UnauthorizedContext,
} from "~web/handlers/context";
import { getReqHeader } from "~web/utils/headers";

const SCHEDULE_DELAY = 100;
const CLEAR_CACHE_DELAY = 2000;

type DefaultValue<TValue, TFallback> = TValue extends UnsetMarker
	? TFallback
	: TValue;

type ProcedureResolver<
	TContext,
	TMeta,
	TContextOverrides,
	TInputOut,
	TOutputParserIn,
	$Output,
> = (
	opts: ProcedureResolverOptions<TContext, TMeta, TContextOverrides, TInputOut>,
) => MaybePromise<
	// If an output parser is defined, we need to return what the parser expects, otherwise we return the inferred type
	DefaultValue<TOutputParserIn, $Output>
>;

type ProcedureResolverShort<C, I, O> = ProcedureResolver<
	C,
	unknown,
	object,
	I,
	UnsetMarker,
	O
>;

const defaultGetKey = <C extends UnauthorizedContext>(context: C): string => {
	if ("auth" in context) {
		return (context as AuthorizedContext).auth.accountId;
		/* c8 ignore start */
	}
	// There are no batched requests with no auth yet
	return "anonymous";
};
/* c8 ignore stop */

export type BatchLoadContextFn<
	C extends UnauthorizedContext,
	I,
	O,
	E extends Error = Error,
> = (ctx: C) => (keys: readonly I[]) => PromiseLike<(O | E)[]>;

export const queueCallFactory = <
	C extends UnauthorizedContext,
	I,
	O,
	E extends Error = Error,
>(
	batchLoadFn: BatchLoadContextFn<C, I, O, E>,
	{
		getKey,
		...batchOpts
	}: Options<I, O, string> & {
		getKey?: (ctx: C) => string;
	} = {},
): ProcedureResolverShort<C, I, O> => {
	const dataloaderStorage: Record<
		string,
		{
			dataloader: Dataloader<I, O, string>;
			removeTimeoutId: ReturnType<typeof setTimeout>;
		}
	> = {};
	return async (opts) => {
		const context = opts.ctx as C;
		const key = (getKey || defaultGetKey)(context);
		const dataloaderObject = dataloaderStorage[key] || {
			dataloader: new Dataloader<I, O, string>(
				(inputs) => batchLoadFn(context)(inputs),
				{
					batchScheduleFn: (callback) => setTimeout(callback, SCHEDULE_DELAY),
					cacheKeyFn: JSON.stringify,
					// Disable cache on test runs - subsequent calls with different data are happening in tests
					cache: !getReqHeader(context, "x-test-id"),
					// Undocumented `opts.path` property
					name: (opts as unknown as { path: string }).path,
					...batchOpts,
				},
			),
			removeTimeoutId: setTimeout(noop, 0),
		};
		dataloaderStorage[key] = dataloaderObject;
		clearTimeout(dataloaderObject.removeTimeoutId);
		dataloaderObject.removeTimeoutId = setTimeout(() => {
			delete dataloaderStorage[key];
		}, CLEAR_CACHE_DELAY);
		return dataloaderObject.dataloader.load(opts.input as I);
	};
};
