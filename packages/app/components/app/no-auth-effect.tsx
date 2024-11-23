import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import { useAuth } from "~app/hooks/use-auth";
import { trpc } from "~app/trpc";

export const NoAuthEffect: React.FC = () => {
	const { unauthorize } = useAuth();
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery(undefined, {
		retry: (count, error) => count < 2 && error.data?.code !== "UNAUTHORIZED",
	});
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			unauthorize();
			router.push("/login");
		}
	}, [accountQuery.error, router, unauthorize]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};
