import React from "react";

import { QueryErrorMessage } from "~app/components/error-message";
import { useAuth } from "~app/hooks/use-auth";
import { useNavigate } from "~app/hooks/use-navigation";
import { trpc } from "~app/trpc";

export const NoAuthEffect: React.FC = () => {
	const { unauthorize } = useAuth();
	const navigate = useNavigate();
	const accountQuery = trpc.account.get.useQuery(undefined, {
		retry: (count, error) => count < 2 && error.data?.code !== "UNAUTHORIZED",
	});
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			unauthorize();
			navigate("/login");
		}
	}, [accountQuery.error, navigate, unauthorize]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};
