import { SubmitHandler } from "react-hook-form";

import { useAsyncCallback } from "app/hooks/use-async-callback";

export const useSubmitHandler = <F, T = unknown>(
	fn: (values: F) => Promise<T>,
	deps: unknown[],
	onDone?: unknown extends T ? () => void : (result: T) => void
) =>
	useAsyncCallback(
		async (isMount, values) => {
			const result = await fn(values as F);
			if (!isMount()) {
				return;
			}
			onDone?.(result);
		},
		// This hook is overriding the rules of hook to accomplish its purpose
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[...deps, onDone]
	) as SubmitHandler<F>;
