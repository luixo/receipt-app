import { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { getQueryClientConfig } from "~app/utils/trpc";

const getQueryClient = () => new QueryClient(getQueryClientConfig());

export type QueryClientsRecord = Record<
	typeof SELF_QUERY_CLIENT_KEY | string,
	QueryClient
>;

export const SELF_QUERY_CLIENT_KEY = Symbol("self-client-id");

export const useQueryClientsStore = create<{
	queryClients: QueryClientsRecord;
	addQueryClient: (key: string) => void;
}>((set) => ({
	queryClients: { [SELF_QUERY_CLIENT_KEY]: getQueryClient() },
	addQueryClient: (key: string) =>
		set(({ queryClients }) => {
			if (queryClients[key]) {
				return { queryClients };
			}
			return {
				queryClients: {
					...queryClients,
					[key]: getQueryClient(),
				},
			};
		}),
}));
