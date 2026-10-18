import type { Query } from "@tanstack/react-query";

import type {
	TRPCError,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCTanstackQueryKey,
} from "~app/trpc";

export type EmptyMutateOptions = {
	onSuccess?: () => void;
	onError?: () => void;
	onSettled?: () => void;
};

export const typeQuery = <K extends TRPCQueryKey>(query: Query, _key: K) =>
	query as unknown as Query<
		TRPCQueryOutput<K>,
		TRPCError,
		TRPCQueryOutput<K>,
		TRPCTanstackQueryKey<K>
	>;
