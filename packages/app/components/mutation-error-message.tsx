import React from "react";

import { MutationObserverErrorResult } from "react-query";

import { TRPCError } from "app/trpc";

import { ErrorMessage } from "./error-message";

type Props = {
	mutation: Pick<
		MutationObserverErrorResult<any, TRPCError, any, any>,
		"reset" | "error"
	>;
};

export const MutationErrorMessage: React.FC<Props> = ({ mutation }) => {
	const reset = React.useCallback(() => mutation.reset(), [mutation]);
	return (
		<ErrorMessage
			button={{ text: "Hide", onClick: reset }}
			message={mutation.error.message}
		/>
	);
};
