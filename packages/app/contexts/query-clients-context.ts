import React from "react";

import { QueryClient } from "@tanstack/react-query";

import { getQueryClientConfig } from "~app/utils/trpc";

export const getQueryClient = () => new QueryClient(getQueryClientConfig());

export type QueryClientsRecord = Record<
	typeof SELF_QUERY_CLIENT_KEY | string,
	QueryClient
>;

export const SELF_QUERY_CLIENT_KEY = Symbol("self-client-id");

export const QueryClientsContext = React.createContext<
	[QueryClientsRecord, React.Dispatch<React.SetStateAction<QueryClientsRecord>>]
>([{ [SELF_QUERY_CLIENT_KEY]: getQueryClient() }, () => {}]);
