import React from "react";

import { useRouter } from "solito/navigation";

import { trpc } from "~app/trpc";

export const AuthEffect: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery();
	React.useEffect(() => {
		if (accountQuery.status === "success") {
			router.replace("/");
		}
	}, [accountQuery.status, router]);
	return null;
};
