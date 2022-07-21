import React from "react";

import {
	QueryObserverRefetchErrorResult,
	QueryObserverLoadingErrorResult,
} from "react-query";

import { TRPCError } from "app/trpc";

import { ErrorMessage } from "./error-message";

type QueryObserverErrorResult =
	| QueryObserverLoadingErrorResult<unknown, TRPCError>
	| QueryObserverRefetchErrorResult<unknown, TRPCError>;

type Props = {
	query: Pick<QueryObserverErrorResult, "refetch" | "error">;
};

export const QueryErrorMessage: React.FC<Props> = ({ query }) => {
	const refetch = React.useCallback(() => query.refetch(), [query]);
	return (
		<ErrorMessage
			button={{ text: "Refetch", onClick: refetch }}
			message={query.error.message}
		/>
	);
};
