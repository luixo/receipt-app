import React from "react";

import { useNavigate } from "~app/hooks/use-navigation";
import { trpc } from "~app/trpc";

export const AuthEffect: React.FC = () => {
	const navigate = useNavigate();
	const accountQuery = trpc.account.get.useQuery();
	React.useEffect(() => {
		if (accountQuery.status === "success") {
			navigate("/", { replace: true });
		}
	}, [accountQuery.status, navigate]);
	return null;
};
