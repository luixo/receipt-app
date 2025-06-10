import React from "react";

import { useQuery } from "@tanstack/react-query";

import { useNavigate } from "~app/hooks/use-navigation";
import { useTRPC } from "~app/utils/trpc";

export const AuthEffect: React.FC = () => {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const accountQuery = useQuery(trpc.account.get.queryOptions());
	React.useEffect(() => {
		if (accountQuery.status === "success") {
			navigate({ to: "/", replace: true });
		}
	}, [accountQuery.status, navigate]);
	return null;
};
