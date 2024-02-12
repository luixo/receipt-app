import type { ResolveOptions } from "@trpc/server/unstableInternalsExport";

import type { ControlledPromise } from "app/utils/utils";
import { createPromise } from "app/utils/utils";
import type { UnauthorizedContext } from "next-app/handlers/context";
import type { t } from "next-app/handlers/trpc";

// This is a homebrew of a https://github.com/graphql/dataloader
// Probably should be rewritten to use dataloader at some point

type BatchedObject<I, O> = {
	input: I;
	promise: ControlledPromise<O>;
};

export const queueCallFactory = <C extends UnauthorizedContext, I, O, M>(
	getData: (ctx: C, inputs: I[]) => Promise<M>,
	getSingleValue: (ctx: C, input: I, values: M) => Promise<O>,
) => {
	const batches: Record<string, BatchedObject<I, O>[]> = {};
	const runCalls = async (
		ctx: C,
		batchedObjects: BatchedObject<I, O>[],
	): Promise<void> => {
		try {
			const inputs = batchedObjects.map(({ input }) => input);
			const results = await getData(ctx, inputs);
			batchedObjects.forEach(async ({ promise, input }) => {
				try {
					const result = await getSingleValue(ctx, input, results);
					promise.resolve(result);
				} catch (e) {
					promise.reject(e);
				}
			});
		} catch (e) {
			batchedObjects.forEach(({ promise }) => promise.reject(e));
		}
	};
	const runCall = async (ctx: C, input: I) =>
		getSingleValue(ctx, input, await getData(ctx, [input]));
	return async (
		opts: ResolveOptions<{
			_config: (typeof t)["_config"];
			_meta: unknown;
			_ctx_out: C;
			_input_in: I;
			_input_out: I;
			_output_in: O;
			_output_out: O;
		}>,
	): Promise<O> => {
		const context = opts.ctx as C;
		const input = opts.input as I;
		const { batch } = context;
		if (!batch) {
			return runCall(context, input);
		}
		const samePathCalls = batch.calls.filter(
			(call) => call.path === (opts as unknown as { path: string }).path,
		);
		if (samePathCalls.length === 1) {
			return runCall(context, input);
		}
		if (!batches[batch.id]) {
			batches[batch.id] = [];
		}
		const promise = createPromise<O>();
		batches[batch.id]!.push({ promise, input });
		if (batches[batch.id]!.length === samePathCalls.length) {
			void runCalls(context, batches[batch.id]!).then(() => {
				delete batches[batch.id];
			});
		}
		return promise.wait();
	};
};
