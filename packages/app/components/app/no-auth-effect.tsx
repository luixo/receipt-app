import React from "react";

import { useQuery } from "@tanstack/react-query";

import { QueryErrorMessage } from "~app/components/error-message";
import { useAuth } from "~app/hooks/use-auth";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTRPC } from "~app/utils/trpc";

export const NoAuthEffect: React.FC = () => {
	const trpc = useTRPC();
	const { unauthorize } = useAuth();
	const navigate = useNavigate();
	const accountQuery = useQuery(
		trpc.account.get.queryOptions(undefined, {
			retry: (count, error) => count < 2 && error.data?.code !== "UNAUTHORIZED",
		}),
	);
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			unauthorize();
			navigate({ to: "/login" });
		}
	}, [accountQuery.error, navigate, unauthorize]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};
