import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "app/components/error-message";
import { trpc } from "app/trpc";

export const NoAuthEffect: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery(undefined, {
		retry: (_count, error) => error.data?.code !== "UNAUTHORIZED",
	});
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			void router.push("/login");
		}
	}, [accountQuery.error, router]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};
