import { SubmitHandler } from "react-hook-form";
import { useAsyncCallback } from "./use-async-callback";

export const useSubmitHandler = <F, T = unknown>(
	fn: (values: F) => Promise<T>,
	deps: unknown[],
	onDone?: () => void
) =>
	useAsyncCallback(async (isMount, values) => {
		await fn(values as F);
		if (!isMount()) {
			return;
		}
		onDone?.();
	}, deps) as SubmitHandler<F>;
